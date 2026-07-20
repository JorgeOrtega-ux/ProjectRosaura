<?php

namespace App\Api\Services\Canvas;

use Exception;
use DateTime;
use function __;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
use App\Core\System\SubscriptionPlanConstants; 
use App\Config\Database\RedisCache;
use App\Config\Database\DatabaseManager;
use PDO;

class CanvasCoreService {
    private $canvasRepository;
    private $userRepository;

    public function __construct(CanvasRepositoryInterface $canvasRepository, UserRepositoryInterface $userRepository) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
}

    private function getValidPalettes(): array {
        $path = dirname(__DIR__, 3) . '/public/assets/data/palettes.json';
        if (file_exists($path)) {
            $json = file_get_contents($path);
            $data = json_decode($json, true);
            if (is_array($data)) {
                return array_keys($data); 
            }
        }
        return ['default']; 
    }

    public function generateWsTicket(?int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
            }

            $ticketUuid = Utils::generateUUID();
            
            $ticketData = [
                'type' => $userId !== null ? 'auth' : 'guest',
                'user_id' => $userId,
                'canvas_id' => $canvasId,
                'created_at' => time()
            ];

            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                if ($redis) {
                    $key = "ws:ticket:{$ticketUuid}";
                    $redis->setex($key, 15, json_encode($ticketData));
                    
                    return ['success' => true, 'data' => ['ticket' => $ticketUuid]];
                }
            }
            
            return ['success' => false, 'message' => __('err_ws_unavailable'), 'http_code' => 503];

        } catch (Exception $e) {
            Logger::error('Error generating WS ticket.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_internal_server_error'), 'http_code' => 500];
        }
    }

    public function getHomeFeed(?int $currentUserId, string $tagFilter = 'all', int $limit = 20, int $offset = 0, bool $canManageOfficial = false): array {
        try {
            $canvases = $this->canvasRepository->getHomeFeed($currentUserId, $tagFilter, $limit, $offset);
            
            $onlineCounts = [];
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis && !empty($canvases)) {
                        $canvasIds = array_column($canvases, 'id');
                        $rawCounts = $redis->hmGet("canvas:online_counts", $canvasIds);
                        foreach ($canvasIds as $idx => $cId) {
                            if ($rawCounts[$idx] !== false) {
                                $onlineCounts[$cId] = $rawCounts[$idx];
                            }
                        }
                    }
                }
            } catch (Exception $e) {}
            
            $formattedCanvases = array_map(function($canvas) use ($currentUserId, $onlineCounts, $canManageOfficial) {
                $canvas['is_owner'] = ($canvas['owner_id'] == $currentUserId && !empty($canvas['owner_id']));
                $canvas['is_locked'] = !empty($canvas['is_locked']);
                $canvas['locked_requires_downgrade'] = !empty($canvas['is_locked']);
                
                $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $canvas['uuid'] . ".png");
                
                $canvas['thumbnail_url'] = $thumbnailUrl;
                $canvas['online_players'] = isset($onlineCounts[$canvas['id']]) ? (int)$onlineCounts[$canvas['id']] : 0;
                return $canvas;
            }, $canvases);

            return ['success' => true, 'data' => $formattedCanvases];
        } catch (Exception $e) {
            Logger::error("Error in getHomeFeed: " . $e->getMessage(), ['user_id' => $currentUserId, 'tag' => $tagFilter]);
            return ['success' => false, 'message' => __('err_fetch_canvases'), 'http_code' => 500];
        }
    }

    public function getPublicCanvases(?int $currentUserId, int $limit = 20, string $sort = 'newest', int $offset = 0, bool $canManageOfficial = false): array {
        try {
            $canvases = $this->canvasRepository->getPublicCanvases($limit, $currentUserId, $sort, $offset);
            
            $onlineCounts = [];
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis && !empty($canvases)) {
                        $canvasIds = array_column($canvases, 'id');
                        $rawCounts = $redis->hmGet("canvas:online_counts", $canvasIds);
                        foreach ($canvasIds as $idx => $cId) {
                            if ($rawCounts[$idx] !== false) {
                                $onlineCounts[$cId] = $rawCounts[$idx];
                            }
                        }
                    }
                }
            } catch (Exception $e) {}
            
            $formattedCanvases = array_map(function($canvas) use ($currentUserId, $onlineCounts, $canManageOfficial) {
                $canvas['is_owner'] = ($canvas['owner_id'] == $currentUserId && !empty($canvas['owner_id']));
                
                $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $canvas['uuid'] . ".png");
                
                $canvas['thumbnail_url'] = $thumbnailUrl;
                $canvas['online_players'] = isset($onlineCounts[$canvas['id']]) ? (int)$onlineCounts[$canvas['id']] : 0;
                $canvas['members_count'] = isset($canvas['members_count']) ? (int)$canvas['members_count'] : 0;
                
                return $canvas;
            }, $canvases);
            
            return ['success' => true, 'data' => $formattedCanvases];
        } catch (Exception $e) {
            Logger::error('Error getting public canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getOfficialCanvases(?int $currentUserId = null, int $limit = 50, string $sort = 'newest', int $offset = 0, bool $canManageOfficial = false): array {
        try {
            $canvases = $this->canvasRepository->getOfficialCanvases($currentUserId, $sort, $limit, $offset);
            
            $onlineCounts = [];
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis && !empty($canvases)) {
                        $canvasIds = array_column($canvases, 'id');
                        $rawCounts = $redis->hmGet("canvas:online_counts", $canvasIds);
                        foreach ($canvasIds as $idx => $cId) {
                            if ($rawCounts[$idx] !== false) {
                                $onlineCounts[$cId] = $rawCounts[$idx];
                            }
                        }
                    }
                }
            } catch (Exception $e) {}
            
            $formattedCanvases = array_map(function($canvas) use ($onlineCounts, $canManageOfficial) {
                $canvas['is_owner'] = false;
                $canvas['privacy'] = 'public'; 
                
                $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $canvas['uuid'] . ".png");
                
                $canvas['thumbnail_url'] = $thumbnailUrl;
                $canvas['online_players'] = isset($onlineCounts[$canvas['id']]) ? (int)$onlineCounts[$canvas['id']] : 0;
                $canvas['members_count'] = isset($canvas['members_count']) ? (int)$canvas['members_count'] : 0;
                
                return $canvas;
            }, $canvases);
            
            return ['success' => true, 'data' => $formattedCanvases];
        } catch (Exception $e) {
            Logger::error('Error getting official canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getMine(?int $userId, int $limit = 50, string $filter = 'all', int $offset = 0): array {
        if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];
        try {
            $canvases = $this->canvasRepository->getUserAndJoinedCanvases($userId, $limit, $filter, $offset);
            
            $formattedCanvases = [];
            foreach ($canvases as $canvas) {
                $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $canvas['uuid'] . ".png");
                
                $lockedReasons = [];
                if (!empty($canvas['locked_reasons'])) {
                    $lockedReasons = is_array($canvas['locked_reasons']) ? $canvas['locked_reasons'] : json_decode($canvas['locked_reasons'], true);
                }

                $formattedCanvases[] = [
                    'id' => $canvas['id'],
                    'uuid' => $canvas['uuid'],
                    'name' => $canvas['name'],
                    'privacy' => $canvas['privacy'],
                    'size' => $canvas['size'],
                    'max_participants' => $canvas['max_participants'],
                    'created_at' => $canvas['created_at'],
                    'is_official' => $canvas['is_official'] ?? 0,
                    'is_favorite' => $canvas['is_favorite'],
                    'is_owner' => $canvas['is_owner'],
                    'online_players' => 0, 
                    'members_count' => $canvas['members_count'],
                    'favorites_count' => $canvas['favorites_count'] ?? 0,
                    'thumbnail_url' => $thumbnailUrl,
                    'locked_requires_downgrade' => (bool)$canvas['is_locked'],
                    'locked_reasons' => $lockedReasons ?: []
                ];
            }
            
            return ['success' => true, 'data' => $formattedCanvases];
        } catch (\Exception $e) {
            Logger::error('Error getting user canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine()];
        }
    }

    public function getCanvas(?int $userId, int $canvasId, bool $canManageOfficial = false): array {
        ini_set('memory_limit', '512M');
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            $roles = [];
            
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($canvasId, $userId);
                
                if (method_exists($this->canvasRepository, 'isFavorite')) {
                    $canvas['is_favorite'] = $this->canvasRepository->isFavorite($userId, $canvasId);
                } else {
                    $canvas['is_favorite'] = false;
                }
            } else {
                $canvas['is_favorite'] = false;
            }
            
            $isOwner = ($userId !== null && $canvas['owner_id'] == $userId);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && empty($roles) && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $canvas['roles'] = $isOwner ? [['id' => 4, 'name' => 'SuperAdministrator', 'weight' => 100, 'is_system' => 1]] : $roles;
            
            $permissions = [];
            if ($isOwner) {
                $permissions = [\App\Core\System\PermissionsConstants::PLACE_PIXELS, \App\Core\System\PermissionsConstants::MANAGE_SETTINGS, \App\Core\System\PermissionsConstants::MANAGE_MEMBERS, 'manage_roles', \App\Core\System\PermissionsConstants::ASSIGN_ROLES, 'view_history', 'manage_resets'];
            } else {
                foreach ($roles as $r) {
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, \App\Core\System\PermissionsConstants::PLACE_PIXELS)) $permissions[] = \App\Core\System\PermissionsConstants::PLACE_PIXELS;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, \App\Core\System\PermissionsConstants::MANAGE_SETTINGS)) $permissions[] = \App\Core\System\PermissionsConstants::MANAGE_SETTINGS;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, \App\Core\System\PermissionsConstants::MANAGE_MEMBERS)) $permissions[] = \App\Core\System\PermissionsConstants::MANAGE_MEMBERS;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) $permissions[] = 'manage_roles';
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, \App\Core\System\PermissionsConstants::ASSIGN_ROLES)) $permissions[] = \App\Core\System\PermissionsConstants::ASSIGN_ROLES;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'view_history')) $permissions[] = 'view_history';
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_resets')) $permissions[] = 'manage_resets';
                }
                $permissions = array_unique($permissions);
            }
            $canvas['permissions'] = $permissions;

            if ($isOwner) {
                $canvas['role'] = 'admin';
            } elseif (in_array(\App\Core\System\PermissionsConstants::MANAGE_SETTINGS, $permissions) || in_array('manage_roles', $permissions)) {
                $canvas['role'] = 'admin';
            } elseif (in_array(\App\Core\System\PermissionsConstants::PLACE_PIXELS, $permissions)) {
                $canvas['role'] = 'editor';
            } else {
                $canvas['role'] = 'spectator';
            }

            if ($canvas['is_locked']) {
                $lockedReasons = [];
                if (!empty($canvas['locked_reasons'])) {
                    $lockedReasons = is_array($canvas['locked_reasons']) ? $canvas['locked_reasons'] : json_decode($canvas['locked_reasons'], true);
                }
                return ['success' => false, 'message' => __('err_plan_expired_downgrade') ?: __('err_premium_expired_downgrade'), 'locked_requires_downgrade' => true, 'locked_reasons' => $lockedReasons ?: []];
            }

            $sizeStr = strtolower($canvas['size']);
            if (strpos($sizeStr, 'x') !== false) {
                $parts = explode('x', $sizeStr);
                $width = (int)$parts[0];
                $height = isset($parts[1]) ? (int)$parts[1] : $width;
            } else {
                $width = (int)$sizeStr;
                $height = $width;
            }
            
            $canvas['max_members'] = $canvas['max_participants'];
            $canvas['width'] = $width;
            $canvas['height'] = $height;
            $canvas['requires_approval'] = (bool)$canvas['requires_approval'];

            $resetSettings = $this->canvasRepository->getResetSettings($canvasId);
            if ($resetSettings && $resetSettings['is_active']) {
                $canvas['next_reset_at'] = $resetSettings['next_reset_at'];
            } else {
                $canvas['next_reset_at'] = null;
            }

            if (method_exists($this->canvasRepository, 'getResizeSettings')) {
                $resizeSettings = $this->canvasRepository->getResizeSettings($canvasId);
                if ($resizeSettings && $resizeSettings['is_active']) {
                    $canvas['next_resize_at'] = $resizeSettings['next_resize_at'];
                    $canvas['target_size'] = $resizeSettings['target_size'];
                } else {
                    $canvas['next_resize_at'] = null;
                    $canvas['target_size'] = null;
                }
            } else {
                $canvas['next_resize_at'] = null;
                $canvas['target_size'] = null;
            }

            $redisKey = "canvas:{$canvasId}:state";
            $stateRaw = null;
            $redis = null;

            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    
                    if ($redis) {
                        $redis->hMSet("canvas:{$canvasId}:config", [
                            'cooldown_batch' => $canvas['cooldown_pixels_batch'] ?? 5,
                            'cooldown_seconds' => $canvas['cooldown_seconds'] ?? 10
                        ]);
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error setting canvas config in Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            try {
                if ($redis && $redis->exists($redisKey)) {
                    $stateRaw = $redis->get($redisKey);
                }
            } catch (Exception $e) {
                Logger::error('Error reading canvas from Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            if ($stateRaw === null || $stateRaw === false) {
                    $stateRaw = $this->canvasRepository->getSnapshot($canvasId);

                    if ($stateRaw && $redis) {
                        try {
                            $redis->set($redisKey, $stateRaw);
                        } catch (Exception $e) {}
                    }
                }

                if (!$stateRaw) {
                    $totalPixels = $width * $height;
                    $stateRaw = str_repeat(chr(0).chr(0).chr(0).chr(0), $totalPixels); 
                    
                    if ($redis) {
                        try {
                            $redis->set($redisKey, $stateRaw);
                        } catch (Exception $e) {}
                    }
                }

                $canvas['state_base64'] = base64_encode(gzencode($stateRaw, 6));
                $canvas['is_compressed'] = true;

            return ['success' => true, 'data' => $canvas];
        } catch (Exception $e) {
            Logger::error('Error getting canvas.', [
                'user_id' => $userId,
                'canvas_id' => $canvasId,
                'exception' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function createCanvas(
        int $userId, 
        string $name, 
        string $privacy, 
        bool $requiresApproval = false, 
        string $size = '64x64', 
        int $limit = 10, 
        string $paletteId = 'default', 
        int $cooldownBatch = 5, 
        int $cooldownSeconds = 10,
        bool $isOfficial = false,
        bool $canCreateOfficial = false,
        int $allowPurchases = 1,
        int $allowChat = 0,
        array $tags = []
    ): array {
        try {
            if ($isOfficial && !$canCreateOfficial) {
                return ['success' => false, 'message' => __('err_cannot_create_official_canvas')];
            }

            if (!$isOfficial) {
                $user = $this->userRepository->findById($userId);
                $tier = $user['subscription_tier'] ?? 0;
                $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                if (method_exists($this->canvasRepository, 'countUserCanvases')) {
                    $currentCanvasCount = $this->canvasRepository->countUserCanvases($userId);
                    if ($planLimits['max_canvases'] !== -1 && $currentCanvasCount >= $planLimits['max_canvases']) {
                        return ['success' => false, 'message' => __('err_canvas_limit_reached') . ' (' . $planLimits['name'] . ').'];
                    }
                }

                if ($planLimits['max_members_per_canvas'] !== -1 && $limit > $planLimits['max_members_per_canvas']) {
                    $limit = $planLimits['max_members_per_canvas']; 
                }

                if ($paletteId !== 'default' && !SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')) {
                    $paletteId = 'default';
                }

                $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
                if (!isset($allSizes[$size])) {
                    $size = '64x64';
                }
                $requiredTier = $allSizes[$size]['tier'] ?? 0;
                if ($tier < $requiredTier) {
                    return ['success' => false, 'message' => __('err_plan_canvas_size')];
                }
            }

            $uuid = Utils::generateUUID();
            $validPalettes = $this->getValidPalettes();
            $paletteId = in_array($paletteId, $validPalettes) ? $paletteId : 'default';

            $validPrivacies = [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE];
            $privacy = in_array($privacy, $validPrivacies) ? $privacy : DB::PRIVACY_PRIVATE;

            $canvasData = [
                'uuid'                  => $uuid,
                'owner_id'              => $userId,
                'name'                  => trim($name),
                'privacy'               => $privacy,
                'requires_approval'     => $requiresApproval ? 1 : 0,
                'size'                  => $size,
                'palette_id'            => $paletteId,
                'max_participants'      => $limit,
                'cooldown_pixels_batch' => max(1, $cooldownBatch),
                'cooldown_seconds'      => max(0, $cooldownSeconds),
                'is_official'           => $isOfficial ? 1 : 0,
                'allow_purchases'       => $allowPurchases,
                'allow_chat'            => $allowChat,
                'tags'                  => array_values(array_intersect($tags, [
                    'art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 
                    'community', 'nature', 'scifi', 'fantasy', 'music', 
                    'sports', 'popculture', 'abstract', 'experimental'
                ]))
            ];
            
            if (count($canvasData['tags']) > 8) {
                $canvasData['tags'] = array_slice($canvasData['tags'], 0, 8);
            }

            $canvasId = $this->canvasRepository->create($canvasData);

            $this->canvasRepository->addMember($canvasId, $userId, 4);

            if (!$isOfficial) {
                try {
                    $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository);
                    $lockManager->evaluateUserCanvases($userId);
                } catch (Exception $e) {
                    Logger::error('Error evaluating canvases on create.', ['error' => $e->getMessage()]);
                }
            }

            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis) {
                        $redis->hMSet("canvas:{$canvasId}:config", [
                            'cooldown_batch' => $canvasData['cooldown_pixels_batch'],
                            'cooldown_seconds' => $canvasData['cooldown_seconds']
                        ]);

                        if ($isOfficial) {
                            $redis->del(CacheConstants::KEY_OFFICIAL_CANVASES);
                        }
                    }
                }
            } catch (Exception $e) {
                Logger::error('Could not save cooldown config in Redis.', ['error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => __('msg_canvas_created'), 'data' => ['uuid' => $uuid]];
        } catch (Exception $e) {
            Logger::error('Error during canvas creation.', [
                'user_id' => $userId,
                'exception' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function updateCanvas(int $userId, int $canvasId, array $data, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $isOwner = ($canvas['owner_id'] == $userId);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if (empty(trim($data['name']))) {
                return ['success' => false, 'message' => __('err_canvas_name_required')];
            }
            
            $validPrivacies = [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE];
            if (!in_array($data['privacy'], $validPrivacies)) {
                $data['privacy'] = DB::PRIVACY_PRIVATE;
            }

            $validPalettes = $this->getValidPalettes();
            if (!isset($data['palette_id']) || !in_array($data['palette_id'], $validPalettes)) {
                $data['palette_id'] = $canvas['palette_id'];
            }

            if ($data['palette_id'] !== 'default' && $canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                if (!SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')) {
                    $data['palette_id'] = 'default';
                }
            }

            $data['requires_approval'] = isset($data['requires_approval']) && $data['requires_approval'] ? 1 : 0;
            $data['cooldown_pixels_batch'] = isset($data['cooldown_pixels_batch']) ? max(1, (int)$data['cooldown_pixels_batch']) : ($canvas['cooldown_pixels_batch'] ?? 5);
            $data['cooldown_seconds'] = isset($data['cooldown_seconds']) ? max(0, (int)$data['cooldown_seconds']) : ($canvas['cooldown_seconds'] ?? 10);
            
            if (isset($data['allow_purchases'])) {
                $data['allow_purchases'] = (int)$data['allow_purchases'];
            }

            if (isset($data['allow_chat'])) {
                $data['allow_chat'] = (int)$data['allow_chat'];
            }

            if (isset($data['tags']) && is_array($data['tags'])) {
                $data['tags'] = array_values(array_intersect($data['tags'], [
                    'art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 
                    'community', 'nature', 'scifi', 'fantasy', 'music', 
                    'sports', 'popculture', 'abstract', 'experimental'
                ]));
                if (count($data['tags']) > 8) {
                    $data['tags'] = array_slice($data['tags'], 0, 8);
                }
            } else {
                $data['tags'] = null;
            }

            if (isset($data['is_official'])) {
                if ($data['is_official'] && !$canManageOfficial) {
                    return ['success' => false, 'message' => __('err_cannot_create_official_canvas')];
                }
                $data['is_official'] = $data['is_official'] ? 1 : 0;
            }

            $updated = $this->canvasRepository->updateCanvasData($canvasId, $data);

            if ($updated) {
                try {
                    if (class_exists(RedisCache::class)) {
                        $redis = (new RedisCache())->getClient();
                        if ($redis) {
                            $redis->hMSet("canvas:{$canvasId}:config", [
                                'cooldown_batch' => $data['cooldown_pixels_batch'],
                                'cooldown_seconds' => $data['cooldown_seconds']
                            ]);

                            if ($canvas['owner_id'] === null) {
                                $redis->del(CacheConstants::KEY_OFFICIAL_CANVASES);
                            }
                        }
                    }
                } catch (Exception $e) { }

                return ['success' => true, 'message' => __('canvas_update_success')];
            }

            return ['success' => false, 'message' => __('err_canvas_update_failed')];
        } catch (Exception $e) {
             Logger::error('Error updating canvas.', [
                 'user_id' => $userId,
                 'canvas_id' => $canvasId,
                 'exception' => $e->getMessage()
             ]);
             return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function downgradeCanvasToBasic(int $userId, string $uuid, string $password = '', bool $canManageOfficial = false): array {
        try {
            $user = $this->userRepository->findById($userId);
            if (!$user) {
                return ['success' => false, 'message' => __('err_user_not_found')];
            }
            $passwordHash = $user['password_hash'] ?? $user['password'] ?? '';
            $isGoogleUser = !empty($user['google_id']);
            if (!$isGoogleUser && $password !== 'GOOGLE_OAUTH_CONFIRMED') {
                if (empty($password) || !password_verify($password, $passwordHash)) {
                    return ['success' => false, 'message' => __('err_invalid_password')];
                }
            }

            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            $isOwner = ($canvas['owner_id'] == $userId);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $ownerTier = 0;
            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $ownerTier = $owner['subscription_tier'] ?? 0;
            }
            $planLimits = SubscriptionPlanConstants::getTierLimits($ownerTier);
            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();

            $canvasId = $canvas['id'];

            if ($planLimits['max_members_per_canvas'] !== -1) {
                $sql = "SELECT user_id FROM " . DB::TBL_CANVAS_MEMBERS . " 
                        WHERE canvas_id = :cid ORDER BY joined_at ASC";
                if (method_exists($this->canvasRepository, 'db')) {
                    
                }
                
                if (method_exists($this->canvasRepository, 'trimMembersToLimit')) {
                    $this->canvasRepository->trimMembersToLimit($canvasId, $planLimits['max_members_per_canvas']);
                }
            }

            $updateData = [
                'name' => $canvas['name'],
                'privacy' => $canvas['privacy'],
                'requires_approval' => $canvas['requires_approval'],
                'palette_id' => 'default',
                'max_participants' => ($planLimits['max_members_per_canvas'] !== -1) ? $planLimits['max_members_per_canvas'] : $canvas['max_participants'],
                'cooldown_pixels_batch' => $canvas['cooldown_pixels_batch'],
                'cooldown_seconds' => $canvas['cooldown_seconds'],
                'allow_purchases' => $canvas['allow_purchases'] ?? 1,
                'allow_chat' => $canvas['allow_chat'] ?? 0,
                'tags' => isset($canvas['tags']) ? (is_array($canvas['tags']) ? $canvas['tags'] : json_decode($canvas['tags'], true)) : []
            ];
            
            $this->canvasRepository->updateCanvasData($canvasId, $updateData);

            $currentSizeStr = (string)($canvas['size'] ?? '64x64');

            $maxAllowedSize = '64x64'; 
            $maxAllowedArea = 0;
            foreach ($allSizes as $sizeKey => $sizeConfig) {
                if ($ownerTier >= ($sizeConfig['tier'] ?? 0)) {
                    $parts = explode('x', strtolower($sizeKey));
                    $area = ((int)$parts[0]) * ((int)($parts[1] ?? $parts[0]));
                    if ($area > $maxAllowedArea) {
                        $maxAllowedArea = $area;
                        $maxAllowedSize = $sizeKey;
                    }
                }
            }

            $reqTierForCurrent = $allSizes[$currentSizeStr]['tier'] ?? 0;
            
            if ($ownerTier < $reqTierForCurrent) {
                
                $this->canvasRepository->updateSize($canvasId, $maxAllowedSize);

                $newParts = explode('x', strtolower($maxAllowedSize));
                $newW = (int)$newParts[0];
                $newH = isset($newParts[1]) ? (int)$newParts[1] : $newW;
                $newTotal = $newW * $newH;
                $newStateRaw = str_repeat(chr(0).chr(0).chr(0).chr(0), $newTotal);

                $stateRaw = $this->canvasRepository->getSnapshot($canvasId);
                    if ($stateRaw) {
                        $oldParts = explode('x', strtolower($currentSizeStr));
                        $oldW = (int)$oldParts[0];
                        $oldH = isset($oldParts[1]) ? (int)$oldParts[1] : $oldW;

                        if (strlen($stateRaw) == ($oldW * $oldH * 4)) {
                            $minH = min($oldH, $newH);
                            $minW = min($oldW, $newW);
                            for ($y = 0; $y < $minH; $y++) {
                                $rowBytes = substr($stateRaw, ($y * $oldW) * 4, $minW * 4);
                                $newStateRaw = substr_replace($newStateRaw, $rowBytes, ($y * $newW) * 4, $minW * 4);
                            }
                        }
                    }

                $this->canvasRepository->saveSnapshot($canvasId, $newStateRaw);

                try {
                    if (class_exists(RedisCache::class)) {
                        $redisInstance = new RedisCache();
                        $redis = $redisInstance->getClient();
                        if ($redis) {
                            $redis->set("canvas:{$canvasId}:state", $newStateRaw);
                        }
                    }
                } catch (Exception $e) {}
            }

            // Re-evaluate user canvases locks to unlock the canvas now that it matches the plan limit
            try {
                $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository);
                $lockManager->evaluateUserCanvases($userId);
            } catch (\Throwable $e) {
                Logger::error('Error evaluating canvases on downgrade.', ['error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => __('msg_canvas_downgraded')];
        } catch (\Throwable $e) {
            Logger::error('Error downgrading canvas to basic.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deleteCanvas(?int $userId, string $uuid, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            $isOwner = ($canvas['owner_id'] == $userId);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $deleted = $this->canvasRepository->deleteCanvasByUuid($uuid);

            if ($deleted) {
                // S3 deletion of thumbnail skipped

                try {
                    if (class_exists(RedisCache::class)) {
                        $redisInstance = new RedisCache();
                        $redis = $redisInstance->getClient();
                        if ($redis) {
                            $redis->del("canvas:{$canvas['id']}:state");
                            $redis->del("canvas:{$canvas['id']}:config");
                            $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESET . $canvas['id']);
                            $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESIZE . $canvas['id']);
                            if ($canvas['owner_id'] === null) {
                                $redis->del(CacheConstants::KEY_OFFICIAL_CANVASES);
                            }
                        }
                    }
                } catch (Exception $e) {}

                if ($canvas['owner_id'] !== null) {
                    try {
                        $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository);
                        $lockManager->evaluateUserCanvases($canvas['owner_id']);
                    } catch (Exception $e) {
                        Logger::error('Error evaluating canvases on delete.', ['error' => $e->getMessage()]);
                    }
                }

                return ['success' => true, 'message' => __('msg_canvas_deleted')];
            }

            return ['success' => false, 'message' => __('err_canvas_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error deleting single canvas.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deleteUserCanvases(int $userId, array $canvasIds, string $password): array {
        try {
            if (empty($canvasIds)) {
                return ['success' => false, 'message' => __('err_no_canvases_selected')];
            }

            $user = $this->userRepository->findById($userId);
            if (!$user) return ['success' => false, 'message' => __('err_unauthorized')];

            $passwordHash = $user['password_hash'] ?? $user['password'] ?? '';
            $isGoogleUser = !empty($user['google_id']);
            if (!$isGoogleUser && $password !== 'GOOGLE_OAUTH_CONFIRMED') {
                if (!password_verify($password, $passwordHash)) {
                    return ['success' => false, 'message' => __('err_invalid_password')];
                }
            }

            $deleted = $this->canvasRepository->deleteCanvases($canvasIds, $userId);

            if ($deleted) {
                // S3 deletion of thumbnail skipped

                try {
                    if (class_exists(RedisCache::class)) {
                        $redisInstance = new RedisCache();
                        $redis = $redisInstance->getClient();
                        if ($redis) {
                            foreach ($canvasIds as $id) {
                                $redis->del("canvas:{$id}:state");
                                $redis->del("canvas:{$id}:config");
                                $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESET . $id);
                                $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESIZE . $id);
                            }
                        }
                    }
                } catch (Exception $e) {}

                return ['success' => true, 'message' => __('msg_canvases_deleted')];
            }

            return ['success' => false, 'message' => __('err_canvases_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error deleting canvases.', ['user_id' => $userId, 'exception' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
