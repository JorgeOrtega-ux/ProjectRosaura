<?php

namespace App\Api\Services\Canvas;

use Exception;
use DateTime;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
use App\Core\System\SubscriptionPlanConstants; 
use App\Core\System\CanvasPermissionsConstants;
use App\Config\Database\RedisCache;
use App\Config\Database\DatabaseManager;
use PDO;

class CanvasAccessService {
    private $canvasRepository;
    private $userRepository;

    public function __construct(CanvasRepositoryInterface $canvasRepository, UserRepositoryInterface $userRepository) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
}

    public function leaveCanvas(int $userId, string $uuid): array {
        try {
            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            if ($canvas['owner_id'] === $userId) {
                return ['success' => false, 'message' => __('err_owner_cannot_leave')];
            }

            $roles = $this->canvasRepository->getMemberRoles($canvas['id'], $userId); if (empty($roles)) {
                return ['success' => false, 'message' => __('err_not_a_member')];
            }

            $removed = $this->canvasRepository->removeMember($canvas['id'], $userId);
            if ($removed) {
                return ['success' => true, 'message' => __('msg_canvas_left')];
            }

            return ['success' => false, 'message' => __('err_leave_canvas_failed')];
        } catch (Exception $e) {
            Logger::error('Error leaving canvas.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function assignMemberRoles(int $requesterId, int $canvasId, int $targetUserId, array $roles): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];
            
            $isOwner = ($canvas['owner_id'] === $requesterId);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $requesterId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = (int)($owner['subscription_tier'] ?? 0);
                if (!SubscriptionPlanConstants::hasFeature($tier, 'advanced_roles')) {
                    return ['success' => false, 'message' => __('err_plan_custom_roles')];
                }
            }

            if ($canvas['owner_id'] === $targetUserId) {
                return ['success' => false, 'message' => __('err_cannot_change_owner_roles')];
            }

            $requesterWeight = $isOwner ? 100 : $this->canvasRepository->getUserCanvasWeight($requesterId, $canvasId);
            
            if (!empty($roles)) {
                $placeholders = implode(',', array_fill(0, count($roles), '?'));
                $db = new DatabaseManager();
                $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
                $stmt = $pdo->prepare("SELECT id, name, weight FROM canvas_roles WHERE id IN ($placeholders) AND (canvas_id = ? OR canvas_id IS NULL)");
                $stmt->execute(array_merge($roles, [$canvasId]));
                $rolesData = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($rolesData as $role) {
                    $roleWeight = (int)$role['weight'];
                    if (!$isOwner) {
                        if ($roleWeight >= $requesterWeight) {
                            return ['success' => false, 'message' => __('err_cannot_assign_high_role') ?: 'No puedes asignar roles con jerarquía igual o superior a la tuya.'];
                        }
                    }
                    if ($roleWeight >= 100 && !$isOwner) {
                        return ['success' => false, 'message' => __('err_role_protected') ?: 'El rol SuperAdministrator está protegido y solo puede ser asignado por el propietario del lienzo.'];
                    }
                }
            }

            $success = $this->canvasRepository->syncUserRoles($canvasId, $targetUserId, $roles);
            if ($success) return ['success' => true, 'message' => __('msg_roles_updated')];
            
            return ['success' => false, 'message' => __('err_roles_update_failed')];
        } catch (Exception $e) {
            Logger::error('Error changing member roles.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function removeMember(int $requesterId, int $canvasId, int $targetUserId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $requesterId);
            $isAdmin = $isOwner || $this->canvasRepository->hasCanvasPermission($canvasId, $requesterId, CanvasPermissionsConstants::MANAGE_ROLES) || $this->canvasRepository->hasCanvasPermission($canvasId, $requesterId, CanvasPermissionsConstants::MANAGE_SETTINGS);

            if (!$isAdmin) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($canvas['owner_id'] === $targetUserId) {
                return ['success' => false, 'message' => __('err_cannot_kick_owner')];
            }

            $removed = $this->canvasRepository->removeMember($canvasId, $targetUserId);
            if ($removed) return ['success' => true, 'message' => __('msg_member_kicked')];
            
            return ['success' => false, 'message' => __('err_member_kick_failed')];
        } catch (Exception $e) {
            Logger::error('Error removing member.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function requestAccess(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            // Check if user is banned from the canvas
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);
            $stmtBan = $pdo->prepare("SELECT id FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ? AND sanction_scope = 'canvas_ban' AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW())) LIMIT 1");
            $stmtBan->execute([$canvasId, $userId]);
            if ($stmtBan->fetch()) {
                return ['success' => false, 'message' => __('err_user_banned_from_canvas')];
            }

            $memberRoles = $this->canvasRepository->getMemberRoles($canvasId, $userId);
            if (!empty($memberRoles) || $canvas['owner_id'] === $userId) {
                return ['success' => true, 'joined' => true, 'message' => __('msg_already_member')];
            }

            if (!$canvas['requires_approval']) {
                if ($canvas['owner_id'] !== null) {
                    $owner = $this->userRepository->findById($canvas['owner_id']);
                    $tier = $owner['subscription_tier'] ?? 0;
                    $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                    if ($planLimits['max_members_per_canvas'] !== -1) {
                        $currentMembers = $this->canvasRepository->countCanvasMembers($canvasId);
                        if ($currentMembers >= $planLimits['max_members_per_canvas']) {
                            return ['success' => false, 'message' => __('err_max_participants_reached')];
                        }
                    }
                }

                $this->canvasRepository->addMember($canvasId, $userId, 1);
                return ['success' => true, 'joined' => true, 'message' => __('msg_joined_success')];
            }

            $existingReq = $this->canvasRepository->getAccessRequest($canvasId, $userId);
            if ($existingReq && $existingReq['status'] === \App\Core\System\StatusConstants::REQUEST_PENDING) {
                return ['success' => false, 'message' => __('err_request_pending')];
            }

            $this->canvasRepository->createAccessRequest($canvasId, $userId);
            return ['success' => true, 'joined' => false, 'message' => __('msg_request_sent')];

        } catch (Exception $e) {
            Logger::error('Error requesting access.', ['user_id' => $userId, 'canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function approveRequest(int $ownerId, int $requestId): array {
        try {
            $request = $this->canvasRepository->getRequestById($requestId);
            if (!$request) return ['success' => false, 'message' => __('err_request_not_found')];

            $canvas = $this->canvasRepository->getById($request['canvas_id']);
            $isOwner = ($canvas['owner_id'] === $ownerId);
            if (!$canvas || !$isOwner) return ['success' => false, 'message' => __('err_unauthorized')];

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                if ($planLimits['max_members_per_canvas'] !== -1) {
                    $currentMembers = $this->canvasRepository->countCanvasMembers($canvas['id']);
                    if ($currentMembers >= $planLimits['max_members_per_canvas']) {
                        return ['success' => false, 'message' => __('err_plan_max_participants')];
                    }
                }
            }

            $this->canvasRepository->updateRequestStatus($requestId, 'approved');
            $this->canvasRepository->addMember($request['canvas_id'], $request['user_id'], 1);

            return ['success' => true, 'message' => __('msg_access_approved')];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function rejectRequest(int $ownerId, int $requestId): array {
        try {
            $request = $this->canvasRepository->getRequestById($requestId);
            if (!$request) return ['success' => false, 'message' => __('err_request_not_found')];

            $canvas = $this->canvasRepository->getById($request['canvas_id']);
            $isOwner = ($canvas['owner_id'] === $ownerId);
            if (!$canvas || !$isOwner) return ['success' => false, 'message' => __('err_unauthorized')];

            $this->canvasRepository->updateRequestStatus($requestId, 'rejected');

            return ['success' => true, 'message' => __('msg_access_rejected')];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getPendingRequests(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$canvas || !$isOwner) return ['success' => false, 'message' => __('err_unauthorized')];

            $requests = $this->canvasRepository->getPendingRequests($canvasId);
            return ['success' => true, 'data' => $requests];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function createLiveShare(int $userId, int $canvasId, string $imgUrl, float $x, float $y, float $w, float $h, float $opacity, float $angle): array {
        try {
            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            
            if (!SubscriptionPlanConstants::hasFeature($tier, 'live_templates')) {
                return ['success' => false, 'message' => __('err_plan_stream_templates')];
            }

            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            $role = null;
            $isOwner = ($canvas['owner_id'] === $userId);

            if (!$isOwner) {
                $hasPermission = $this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::PLACE_PIXELS);
                if (!$hasPermission && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::MANAGE_SETTINGS)) {
                    return ['success' => false, 'message' => __('err_unauthorized')];
                }
            }

            $hex = strtoupper(bin2hex(random_bytes(4)));
            $code = substr($hex, 0, 4) . '-' . substr($hex, 4, 4);

            $data = [
                'owner_id' => $userId,
                'canvas_id' => $canvasId,
                'img_url' => $imgUrl,
                'x' => $x,
                'y' => $y,
                'w' => $w,
                'h' => $h,
                'opacity' => $opacity,
                'angle' => $angle,
                'created_at' => time()
            ];

            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                if ($redis) {
                    // Check if the user already has an active broadcast
                    $userBroadcastKey = CacheConstants::PREFIX_LIVE_SHARE . 'user_' . $userId;
                    $existingCode = $redis->get($userBroadcastKey);
                    if ($existingCode) {
                        $existingData = $redis->get(CacheConstants::PREFIX_LIVE_SHARE . $existingCode);
                        if ($existingData) {
                            return ['success' => false, 'message' => __('err_already_broadcasting')];
                        } else {
                            // Stale key — old session expired, clean up
                            $redis->del($userBroadcastKey);
                        }
                    }

                    $key = CacheConstants::PREFIX_LIVE_SHARE . $code;
                    $redis->set($key, json_encode($data));
                    $redis->expire($key, 14400); 

                    $redis->set($userBroadcastKey, $code);
                    $redis->expire($userBroadcastKey, 14400);

                    return ['success' => true, 'data' => ['code' => $code]];
                }
            }

            return ['success' => false, 'message' => __('err_stream_service_unavailable')];
        } catch (Exception $e) {
            Logger::error('Error createLiveShare.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }

    public function joinLiveShare(string $code, int $targetCanvasId, ?int $userId = null): array {
        try {
            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                if ($redis) {
                    if ($userId) {
                        $userBroadcastKey = CacheConstants::PREFIX_LIVE_SHARE . 'user_' . $userId;
                        $activeCode = $redis->get($userBroadcastKey);
                        if ($activeCode) {
                            
                            $activeData = $redis->get(CacheConstants::PREFIX_LIVE_SHARE . $activeCode);
                            if ($activeData) {
                                return ['success' => false, 'message' => __('err_cannot_join_while_streaming')];
                            } else {
                                $redis->del($userBroadcastKey); 
                            }
                        }
                    }

                    $key = CacheConstants::PREFIX_LIVE_SHARE . $code;
                    $dataRaw = $redis->get($key);
                    
                    if ($dataRaw) {
                        $data = json_decode($dataRaw, true);

                        if (isset($data['canvas_id']) && (int)$data['canvas_id'] !== $targetCanvasId) {
                            return ['success' => false, 'message' => __('err_stream_wrong_canvas')];
                        }
                        
                        return ['success' => true, 'data' => $data];
                    }
                }
            }
            return ['success' => false, 'message' => __('err_session_not_found')];
        } catch (Exception $e) {
            Logger::error('Error joinLiveShare.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }

    public function generateInvite(int $userId, int $canvasId, string $role, ?int $maxUses, ?string $expiresAt): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized_invites')];
            }

            $roles = $this->canvasRepository->getCanvasRoles($canvasId);
            $roleData = null;
            foreach ($roles as $r) {
                if ((string)$r['id'] === (string)$role || strtolower($r['name']) === strtolower($role)) {
                    $roleData = $r;
                    $role = (string)$r['id']; 
                    break;
                }
            }

            if (!$roleData) {
                return ['success' => false, 'message' => __('err_invalid_role')];
            }

            $nameLower = strtolower(trim($roleData['name']));
            if (in_array($nameLower, \App\Core\System\CanvasConstants::RESERVED_ROLES) || (isset($roleData['weight']) && (int)$roleData['weight'] >= 100)) {
                return ['success' => false, 'message' => __('err_cannot_invite_high_privilege')];
            }

            if ($expiresAt) {
                $date = DateTime::createFromFormat('Y-m-d H:i:s', $expiresAt);
                if (!$date || $date->format('Y-m-d H:i:s') !== $expiresAt || $date->getTimestamp() <= time()) {
                    return ['success' => false, 'message' => __('err_invalid_expiration_date')];
                }
            }

            $code = strtoupper(substr(Utils::generateUUID(), 0, 4) . '-' . substr(Utils::generateUUID(), 4, 4));

            $inviteId = $this->canvasRepository->createInvite($canvasId, $code, $role, $maxUses, $expiresAt, $userId);

            return ['success' => true, 'message' => __('msg_invite_generated'), 'data' => ['code' => $code]];
        } catch (Exception $e) {
            Logger::error('Error generating invite.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_invite_generation_failed')];
        }
    }

    public function listInvites(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized_view_invites')];
            }

            $invites = $this->canvasRepository->getInvites($canvasId);
            return ['success' => true, 'data' => $invites];
        } catch (Exception $e) {
            Logger::error('Error listing invites.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_getting_invites_failed')];
        }
    }

    public function revokeInvite(int $userId, int $canvasId, int $inviteId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized_revoke_invites')];
            }

            $revoked = $this->canvasRepository->revokeInvite($inviteId, $canvasId);
            if ($revoked) {
                return ['success' => true, 'message' => __('msg_invite_revoked')];
            }
            return ['success' => false, 'message' => __('err_invite_revoke_failed')];
        } catch (Exception $e) {
            Logger::error('Error revoking invite.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_revoke_invite_failed')];
        }
    }

    public function joinViaInvite(int $userId, string $code): array {
        try {
            $invite = $this->canvasRepository->getInviteByCode($code);
            if (!$invite) {
                return ['success' => false, 'message' => __('err_invalid_invite_code')];
            }

            if ($invite['expires_at'] && strtotime($invite['expires_at']) <= time()) {
                return ['success' => false, 'message' => __('err_invite_expired')];
            }

            // Pre-check limit (non-authoritative, just for fast feedback)
            if ($invite['max_uses'] !== null && $invite['uses_count'] >= $invite['max_uses']) {
                return ['success' => false, 'message' => __('err_invite_limit_reached')];
            }

            $canvasId = $invite['canvas_id'];
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_deleted')];

            // Check if user is banned from the canvas
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);
            $stmtBan = $pdo->prepare("SELECT id FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ? AND sanction_scope = 'canvas_ban' AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW())) LIMIT 1");
            $stmtBan->execute([$canvasId, $userId]);
            if ($stmtBan->fetch()) {
                return ['success' => false, 'message' => __('err_user_banned_from_canvas')];
            }

            $memberRoles = $this->canvasRepository->getMemberRoles($canvasId, $userId);
            if (!empty($memberRoles) || $canvas['owner_id'] === $userId) {
                return ['success' => true, 'message' => __('msg_already_member'), 'data' => ['uuid' => $canvas['uuid']]];
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                if ($planLimits['max_members_per_canvas'] !== -1) {
                    $currentMembers = $this->canvasRepository->countCanvasMembers($canvasId);
                    if ($currentMembers >= $planLimits['max_members_per_canvas']) {
                        return ['success' => false, 'message' => __('err_plan_max_participants')];
                    }
                }
            }

            // Atomic increment: this is the authoritative limit check (prevents race condition)
            $incremented = $this->canvasRepository->incrementInviteUses($invite['id']);
            if (!$incremented) {
                return ['success' => false, 'message' => __('err_invite_limit_reached')];
            }

            $added = $this->canvasRepository->addMember($canvasId, $userId, (int)$invite['role']);
            if ($added) {
                return ['success' => true, 'message' => __('msg_joined_canvas'), 'data' => ['uuid' => $canvas['uuid']]];
            }

            return ['success' => false, 'message' => __('err_join_canvas_failed')];
        } catch (Exception $e) {
            Logger::error('Error joining via invite.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_processing_invite')];
        }
    }
}
