<?php
// api/controllers/Canvas/CanvasChatRestrictionController.php
namespace App\Api\Controllers\Canvas;

use App\Api\Controllers\BaseController;
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants;
use App\Core\System\CacheConstants;
use App\Core\System\Logger;
use App\Core\System\PermissionsConstants;
use App\Core\System\CanvasPermissionsConstants;

class CanvasChatRestrictionController extends BaseController {
    private $pdo;
    private $db;
    private $canvasRepository;
    private $redisClient;

    public function __construct(DatabaseManager $db, \App\Core\Interfaces\CanvasRepositoryInterface $canvasRepository, \App\Config\Database\RedisCache $redisCache) {
        $this->db = $db;
        $this->pdo = $db->getConnection(DatabaseConstants::CONN_CANVASES);
        $this->canvasRepository = $canvasRepository;
        $this->redisClient = $redisCache->getClient();
    }

    public function updateRestriction($data) {
        if (!isset($_SESSION['active_account'])) {
            return $this->respond(['success' => false, 'message' => __('err_unauthorized')]);
        }

        $userId = $_SESSION['active_account'];
        
        $canvasId = $data['canvas_id'] ?? null;
        $targetUserId = $data['target_user_id'] ?? null;
        $isSuspended = $data['is_suspended'] ?? '0';
        $sanctionScope = $data['sanction_scope'] ?? 'chat_mute';
        $suspensionType = $data['suspension_type'] ?? null;
        $suspensionReason = $data['suspension_reason'] ?? null;
        $endDate = $data['end_date'] ?? null;
        if ($endDate === '') {
            $endDate = null;
        }
        
        // Add password verification
        $password = $data['password'] ?? '';
        $credential = $data['credential'] ?? $data['google_token'] ?? '';
        
        if (!$canvasId || !$targetUserId || (empty($password) && empty($credential))) {
            return $this->respond(['success' => false, 'message' => __('err_missing_parameters')]);
        }

        $identityDb = $this->db->getConnection(DatabaseConstants::CONN_IDENTITY);
        $stmt = $identityDb->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$user || !\App\Core\Helpers\Utils::verifyUserIdentity($user, $data)) {
            $isGoogle = !empty($data['credential']) || !empty($data['google_token']);
            return $this->respond(['success' => false, 'message' => $isGoogle ? __('auth.google_verification_failed') : __('err_invalid_password')]);
        }

        // Resolve canvas by ID or UUID
        $stmt = $this->pdo->prepare("SELECT id, owner_id as user_id, allow_chat FROM canvases WHERE id = ? OR uuid = ? LIMIT 1");
        $stmt->execute([$canvasId, $canvasId]);
        $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$canvas) {
            return $this->respond(['success' => false, 'message' => __('err_canvas_not_found')]);
        }
        $canvasId = (int)$canvas['id'];

        // Resolve target user by ID or UUID
        if (!is_numeric($targetUserId)) {
            $uStmt = $identityDb->prepare("SELECT id FROM users WHERE uuid = ? LIMIT 1");
            $uStmt->execute([$targetUserId]);
            $realTargetId = $uStmt->fetchColumn();
            if ($realTargetId) {
                $targetUserId = (int)$realTargetId;
            }
        } else {
            $targetUserId = (int)$targetUserId;
        }

        // Only owner can ban (or implement role logic)
        if ($canvas['user_id'] != $userId) {
            $stmt = $this->pdo->prepare("SELECT cp.name FROM canvas_user_roles cur JOIN canvas_role_permissions crp ON cur.role_id = crp.role_id JOIN canvas_permissions cp ON crp.permission_id = cp.id WHERE cur.canvas_id = ? AND cur.user_id = ?");
            $stmt->execute([$canvasId, $userId]);
            $permissionsRows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            $perms = array_column($permissionsRows, 'name');
            
            $canModerate = false;
            if (in_array(CanvasPermissionsConstants::MANAGE_SETTINGS, $perms) || 
                in_array(CanvasPermissionsConstants::MANAGE_MEMBERS, $perms) || 
                in_array(CanvasPermissionsConstants::MANAGE_SANCTIONS, $perms) || 
                in_array(PermissionsConstants::MODERATE_CHAT, $perms)) {
                $canModerate = true;
            }
            if (!$canModerate) {
                return $this->respond(['success' => false, 'message' => __('err_no_permissions')]);
            }

            $modWeight = $this->canvasRepository->getUserCanvasWeight($userId, $canvasId);
            $targetWeight = $this->canvasRepository->getUserCanvasWeight($targetUserId, $canvasId);
            if ($targetWeight >= $modWeight) {
                return $this->respond(['success' => false, 'message' => __('err_insufficient_hierarchy')]);
            }
        }

        // Also prevent banning the owner
        if ($targetUserId === $canvas['user_id']) {
            return $this->respond(['success' => false, 'message' => __('err_cannot_ban_owner')]);
        }

        try {
            if ($isSuspended === '1') {
                $validReasons = array_column(\App\Core\Helpers\Utils::getSanctionReasons()['suspensions'], 'key');
                if (!in_array($suspensionReason, $validReasons)) {
                    return $this->respond(['success' => false, 'message' => __('validation.invalid_reason')]);
                }

                if ($sanctionScope === 'canvas_ban') {
                    $this->canvasRepository->removeMember($canvasId, $targetUserId);
                }

                // Insert or update restriction
                $stmt = $this->pdo->prepare("
                    INSERT INTO canvas_sanctions 
                    (canvas_id, user_id, restricted_by, sanction_scope, suspension_type, suspension_reason, end_date) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    restricted_by = VALUES(restricted_by),
                    sanction_scope = VALUES(sanction_scope),
                    suspension_type = VALUES(suspension_type),
                    suspension_reason = VALUES(suspension_reason),
                    end_date = VALUES(end_date)
                ");
                $stmt->execute([
                    $canvasId,
                    $targetUserId,
                    $userId,
                    $sanctionScope,
                    $suspensionType,
                    $suspensionReason,
                    $endDate
                ]);
                
                $this->syncUserRestrictionsToRedis($canvasId, $targetUserId);

                return $this->respond(['success' => true, 'message' => __('msg_sanction_applied')]);
            } else {
                // Remove restriction
                $stmt = $this->pdo->prepare("DELETE FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ? AND sanction_scope = ?");
                $stmt->execute([$canvasId, $targetUserId, $sanctionScope]);
                
                $this->syncUserRestrictionsToRedis($canvasId, $targetUserId);
                
                return $this->respond(['success' => true, 'message' => __('msg_sanction_removed')]);
            }
        } catch (\Throwable $e) {
            return $this->handleException($e, 'updateRestriction');
        }
    }

    private function syncUserRestrictionsToRedis($canvasId, $targetUserId) {
        if (!$this->redisClient) return;

        // Query active sanctions for this user on this canvas
        $stmt = $this->pdo->prepare("
            SELECT sanction_scope, suspension_type, end_date 
            FROM canvas_sanctions 
            WHERE canvas_id = ? AND user_id = ? 
              AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW()))
        ");
        $stmt->execute([$canvasId, $targetUserId]);
        $activeSanctions = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $hasCanvasBan = false;
        $hasChatMute = false;
        
        $canvasBanTtl = 0;
        $chatMuteTtl = 0;

        foreach ($activeSanctions as $sanction) {
            $scope = $sanction['sanction_scope'];
            $type = $sanction['suspension_type'];
            $endDate = $sanction['end_date'];
            
            $ttl = 0;
            if ($type === 'temporary' && $endDate) {
                $ttl = strtotime($endDate) - time();
            }

            if ($scope === 'canvas_ban') {
                $hasCanvasBan = true;
                $canvasBanTtl = ($type === 'permanent') ? -1 : max($canvasBanTtl, $ttl);
            } elseif ($scope === 'chat_mute') {
                $hasChatMute = true;
                $chatMuteTtl = ($type === 'permanent') ? -1 : max($chatMuteTtl, $ttl);
            }
        }

        $banKey = sprintf(CacheConstants::PREFIX_CANVAS_BANNED, $canvasId, $targetUserId);
        if ($hasCanvasBan) {
            if ($canvasBanTtl == -1) {
                $this->redisClient->set($banKey, '1');
            } elseif ($canvasBanTtl > 0) {
                $this->redisClient->setex($banKey, $canvasBanTtl, '1');
            } else {
                $this->redisClient->del($banKey);
            }
        } else {
            $this->redisClient->del($banKey);
        }

        $chatKey = sprintf(CacheConstants::PREFIX_CHAT_RESTRICTED, $canvasId, $targetUserId);
        if ($hasCanvasBan || $hasChatMute) {
            if ($canvasBanTtl == -1 || $chatMuteTtl == -1) {
                $this->redisClient->set($chatKey, '1');
            } else {
                $combinedTtl = max($canvasBanTtl, $chatMuteTtl);
                if ($combinedTtl > 0) {
                    $this->redisClient->setex($chatKey, $combinedTtl, '1');
                } else {
                    $this->redisClient->del($chatKey);
                }
            }
        } else {
            $this->redisClient->del($chatKey);
        }
    }
}
