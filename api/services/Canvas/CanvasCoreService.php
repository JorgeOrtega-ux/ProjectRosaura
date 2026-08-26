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
use App\Core\System\CanvasPermissionsConstants;
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

    public function validateCanvasAccess(?int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas || !empty($canvas['deleted_at'])) {
                return ['success' => false, 'message' => __('err_canvas_not_found'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
            }

            $isOwner = ($userId !== null && (int)($canvas['owner_id'] ?? 0) === (int)$userId);
            $isOffline = (($canvas['mode'] ?? 'offline') === 'offline' || empty($canvas['is_online_active']));

            if ($isOffline && !$isOwner) {
                return ['success' => false, 'message' => __('err_canvas_not_found'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
            }

            if (($canvas['privacy'] ?? '') === DB::PRIVACY_PRIVATE) {
                if ($userId === null) {
                    return ['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED];
                }
                if (!$isOwner) {
                    $roles = $this->canvasRepository->getMemberRoles($canvasId, $userId);
                    if (empty($roles)) {
                        return ['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
                    }
                }
            }

            return ['success' => true, 'canvas' => $canvas];
        } catch (\Throwable $e) {
            Logger::error('Error validating canvas access.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database'), 'http_code' => 500];
        }
    }

    public function generateWsTicket(?int $userId, int $canvasId): array {
        try {
            $access = $this->validateCanvasAccess($userId, $canvasId);
            if (!$access['success']) {
                return [
                    'success' => false,
                    'message' => $access['message'] ?? __('err_unauthorized'),
                    'http_code' => $access['http_code'] ?? \App\Core\System\HttpConstants::FORBIDDEN
                ];
            }

            $canvas = $access['canvas'] ?? $this->canvasRepository->getById($canvasId);
            $isOffline = (($canvas['mode'] ?? 'offline') === 'offline' || empty($canvas['is_online_active']));
            if ($isOffline) {
                return ['success' => false, 'message' => __('err_canvas_offline') ?: 'Este lienzo está en modo estudio privado.', 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
            }

            $secret = \App\Core\Helpers\EnvLoader::get('INTERNAL_API_SECRET');
            if (empty($secret)) {
                Logger::critical('INTERNAL_API_SECRET is not configured in environment. Cannot generate WS ticket.');
                return ['success' => false, 'message' => __('err_internal_server_error'), 'http_code' => 500];
            }

            $time = time();
            $tokenData = [
                'type' => $userId !== null ? 'auth' : 'guest',
                'user_id' => $userId,
                'canvas_id' => $canvasId,
                'iat' => $time,
                'exp' => $time + 15
            ];

            $token = \App\Core\Security\JWT::encode($tokenData, $secret);

            return ['success' => true, 'data' => ['ticket' => $token]];

        } catch (Exception $e) {
            Logger::error('Error generating WS ticket.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_internal_server_error'), 'http_code' => 500];
        }
    }

    public function getHomeFeed(?int $currentUserId, string $tagFilter = 'all', int $limit = 20, int $offset = 0): array {
        try {
            $canvases = $this->canvasRepository->getHomeFeed($currentUserId, $tagFilter, $limit, $offset);
            if (!is_array($canvases) || (isset($canvases['success']) && !$canvases['success'])) {
                return ['success' => true, 'data' => []];
            }
            
            $onlineCounts = [];
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis && !empty($canvases)) {
                        $canvasIds = array_filter(array_column($canvases, 'id'));
                        if (!empty($canvasIds)) {
                            $rawCounts = $redis->hmGet("canvas:online_counts", $canvasIds);
                            foreach ($canvasIds as $idx => $cId) {
                                if (isset($rawCounts[$idx]) && $rawCounts[$idx] !== false) {
                                    $onlineCounts[$cId] = $rawCounts[$idx];
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {}
            
            $formattedCanvases = [];
            foreach ($canvases as $canvas) {
                if (!is_array($canvas)) continue;
                $canvas['is_owner'] = (isset($canvas['owner_id']) && $canvas['owner_id'] == $currentUserId && !empty($canvas['owner_id']));
                $canvas['is_member'] = !empty($canvas['is_member']);
                $canvas['is_subscription_locked'] = !empty($canvas['is_subscription_locked']);
                $canvas['locked_requires_downgrade'] = !empty($canvas['is_subscription_locked']);
                
                $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . ($canvas['uuid'] ?? '') . ".webp");
                
                $canvas['thumbnail_url'] = $thumbnailUrl;
                $canvas['online_players'] = (isset($canvas['id']) && isset($onlineCounts[$canvas['id']])) ? (int)$onlineCounts[$canvas['id']] : 0;
                $formattedCanvases[] = $canvas;
            }

            // Append cache-busting ?v= timestamp from Redis so browsers always reload updated thumbnails
            try {
                if (!empty($formattedCanvases) && isset($redis) && $redis) {
                    $uuids = array_filter(array_column($formattedCanvases, 'uuid'));
                    if (!empty($uuids)) {
                        $versionKeys = array_map(fn($uuid) => "canvas:{$uuid}:thumbnail_version", $uuids);
                        $versions = $redis->mGet($versionKeys);
                        foreach ($formattedCanvases as $i => &$c) {
                            $v = $versions[$i] ?? null;
                            if ($v) {
                                $c['thumbnail_url'] .= '?v=' . $v;
                            }
                        }
                        unset($c);
                    }
                }
            } catch (\Throwable $e) {}

            return ['success' => true, 'data' => $formattedCanvases];
        } catch (\Throwable $e) {
            Logger::error("Error in getHomeFeed: " . $e->getMessage(), ['user_id' => $currentUserId, 'tag' => $tagFilter]);
            return ['success' => false, 'message' => __('err_fetch_canvases'), 'http_code' => 500];
        }
    }

    public function getPublicCanvases(?int $currentUserId, int $limit = 20, string $sort = 'newest', int $offset = 0): array {
        try {
            $canvases = $this->canvasRepository->getPublicCanvases($limit, $currentUserId, $sort, $offset);
            if (!is_array($canvases) || (isset($canvases['success']) && !$canvases['success'])) {
                return ['success' => true, 'data' => []];
            }
            
            $onlineCounts = [];
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis && !empty($canvases)) {
                        $canvasIds = array_filter(array_column($canvases, 'id'));
                        if (!empty($canvasIds)) {
                            $rawCounts = $redis->hmGet("canvas:online_counts", $canvasIds);
                            foreach ($canvasIds as $idx => $cId) {
                                if (isset($rawCounts[$idx]) && $rawCounts[$idx] !== false) {
                                    $onlineCounts[$cId] = $rawCounts[$idx];
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {}
            
            $formattedCanvases = [];
            foreach ($canvases as $canvas) {
                if (!is_array($canvas)) continue;
                $canvas['is_owner'] = (isset($canvas['owner_id']) && $canvas['owner_id'] == $currentUserId && !empty($canvas['owner_id']));
                $canvas['is_member'] = !empty($canvas['is_member']);
                
                $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . ($canvas['uuid'] ?? '') . ".webp");
                
                $canvas['thumbnail_url'] = $thumbnailUrl;
                $canvas['online_players'] = (isset($canvas['id']) && isset($onlineCounts[$canvas['id']])) ? (int)$onlineCounts[$canvas['id']] : 0;
                $canvas['members_count'] = isset($canvas['members_count']) ? (int)$canvas['members_count'] : 0;
                
                $formattedCanvases[] = $canvas;
            }
            
            return ['success' => true, 'data' => $formattedCanvases];
        } catch (\Throwable $e) {
            Logger::error('Error getting public canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }


    public function getMine(?int $userId, int $limit = 50, string $filter = 'all', int $offset = 0): array {
        if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];
        try {
            $canvases = $this->canvasRepository->getUserAndJoinedCanvases($userId, $limit, $filter, $offset);
            if (!is_array($canvases) || (isset($canvases['success']) && !$canvases['success'])) {
                $canvases = [];
            }
            
            $onlineCounts = [];
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis && !empty($canvases)) {
                        $canvasIds = array_filter(array_column($canvases, 'id'));
                        if (!empty($canvasIds)) {
                            $rawCounts = $redis->hmGet("canvas:online_counts", $canvasIds);
                            foreach ($canvasIds as $idx => $cId) {
                                if (isset($rawCounts[$idx]) && $rawCounts[$idx] !== false) {
                                    $onlineCounts[$cId] = $rawCounts[$idx];
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {}

            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
            $currentStorageMB = $this->canvasRepository->getUserStorageUsed($userId);
            $onlineSlotsUsed = $this->canvasRepository->countUserOnlineCanvases($userId);
            $onlineSlotsMax = $planLimits['max_online_canvases'] ?? $planLimits['max_canvases'] ?? 1;
            $storageMaxMB = $planLimits['max_storage_mb'] ?? 20;

            $formattedCanvases = [];
            foreach ($canvases as $canvas) {
                if (!is_array($canvas)) continue;
                $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . ($canvas['uuid'] ?? '') . ".webp");
                
                $lockedReasons = [];
                if (!empty($canvas['locked_reasons'])) {
                    $lockedReasons = is_array($canvas['locked_reasons']) ? $canvas['locked_reasons'] : json_decode($canvas['locked_reasons'], true);
                }

                $formattedCanvases[] = [
                    'id' => $canvas['id'] ?? 0,
                    'uuid' => $canvas['uuid'] ?? '',
                    'name' => $canvas['name'] ?? '',
                    'privacy' => $canvas['privacy'] ?? '',
                    'size' => $canvas['size'] ?? '',
                    'mode' => $canvas['mode'] ?? 'offline',
                    'is_online_active' => (bool)($canvas['is_online_active'] ?? 0),
                    'storage_bytes' => (int)($canvas['storage_bytes'] ?? 0),
                    'max_participants' => $canvas['max_participants'] ?? null,
                    'created_at' => $canvas['created_at'] ?? null,
                    'is_favorite' => !empty($canvas['is_favorite']),
                    'is_owner' => !empty($canvas['is_owner']),
                    'is_member' => !empty($canvas['is_member']),
                    'online_players' => (isset($canvas['id']) && isset($onlineCounts[$canvas['id']])) ? (int)$onlineCounts[$canvas['id']] : 0, 
                    'members_count' => $canvas['members_count'] ?? 0,
                    'favorites_count' => $canvas['favorites_count'] ?? 0,
                    'thumbnail_url' => $thumbnailUrl,
                    'locked_requires_downgrade' => (bool)($canvas['is_subscription_locked'] ?? 0),
                    'locked_reasons' => $lockedReasons ?: []
                ];
            }
            
            return [
                'success' => true, 
                'data' => $formattedCanvases,
                'stats' => [
                    'storage_used_mb' => round($currentStorageMB, 2),
                    'storage_max_mb' => $storageMaxMB,
                    'online_slots_used' => $onlineSlotsUsed,
                    'online_slots_max' => $onlineSlotsMax
                ]
            ];
        } catch (\Throwable $e) {
            Logger::error('Error getting user canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine()];
        }
    }

    public function getCanvas(?int $userId, int $canvasId): array {
        $t0 = microtime(true);
        ini_set('memory_limit', '512M');
        
        $cacheKey = CacheConstants::PREFIX_CANVAS_META . $canvasId . CacheConstants::SUFFIX_CANVAS_META_USER . ($userId ?? 0);
        $redis = null;
        try {
            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                if ($redis) {
                    error_log("[DEBUG getCanvas] Redis initialized successfully.");
                    $cached = $redis->get($cacheKey);
                    if ($cached) {
                        error_log("[DEBUG getCanvas] Found cached metadata in Redis for key: $cacheKey");
                        $cachedData = json_decode($cached, true);
                        if ($cachedData) {
                            $tEnd = microtime(true);
                            $cachedData['debug_timing'] = [
                                'total' => $tEnd - $t0,
                                'cached' => true
                            ];
                            return $cachedData;
                        }
                    } else {
                        error_log("[DEBUG getCanvas] No cache found for key: $cacheKey");
                    }
                } else {
                    error_log("[DEBUG getCanvas] Redis client is null.");
                }
            } else {
                error_log("[DEBUG getCanvas] RedisCache class does not exist.");
            }
        } catch (\Throwable $e) {
            error_log("[DEBUG getCanvas] Caching exception: " . $e->getMessage());
        }

        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            
            if (!$canvas || !empty($canvas['deleted_at'])) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $isOwner = ($userId !== null && (int)($canvas['owner_id'] ?? 0) === (int)$userId);
            $isOffline = (($canvas['mode'] ?? 'offline') === 'offline' || empty($canvas['is_online_active']));

            if ($isOffline && !$isOwner) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            if (!empty($canvas['owner_id'])) {
                $owner = $this->userRepository->findById((int)$canvas['owner_id']);
                $canvas['owner_username'] = $owner ? ($owner['username'] ?? '-') : '-';
            } else {
                $canvas['owner_username'] = '-';
            }
            
            $thumbnailUrl = null;
            try {
                $thumbCheckRedis = class_exists(RedisCache::class) ? (new RedisCache())->getClient() : null;
                $isPending = $thumbCheckRedis ? $thumbCheckRedis->sIsMember('canvases:pending_snapshots', (string)$canvasId) : false;
                if (!$isPending) {
                    $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $canvas['uuid'] . ".webp");
                }
            } catch (\Throwable $e) {
                $thumbnailUrl = \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $canvas['uuid'] . ".webp");
            }
            $canvas['thumbnail_url'] = $thumbnailUrl;
            
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
                $permissions = [
                    CanvasPermissionsConstants::PLACE_PIXELS,
                    CanvasPermissionsConstants::MANAGE_SETTINGS,
                    CanvasPermissionsConstants::MANAGE_MEMBERS,
                    CanvasPermissionsConstants::MANAGE_ROLES,
                    CanvasPermissionsConstants::ASSIGN_ROLES,
                    CanvasPermissionsConstants::VIEW_HISTORY,
                    CanvasPermissionsConstants::MANAGE_RESETS
                ];
            } else {
                foreach ($roles as $r) {
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::PLACE_PIXELS)) $permissions[] = CanvasPermissionsConstants::PLACE_PIXELS;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::MANAGE_SETTINGS)) $permissions[] = CanvasPermissionsConstants::MANAGE_SETTINGS;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::MANAGE_MEMBERS)) $permissions[] = CanvasPermissionsConstants::MANAGE_MEMBERS;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::MANAGE_ROLES)) $permissions[] = CanvasPermissionsConstants::MANAGE_ROLES;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::ASSIGN_ROLES)) $permissions[] = CanvasPermissionsConstants::ASSIGN_ROLES;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::VIEW_HISTORY)) $permissions[] = CanvasPermissionsConstants::VIEW_HISTORY;
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::MANAGE_RESETS)) $permissions[] = CanvasPermissionsConstants::MANAGE_RESETS;
                }
                $permissions = array_unique($permissions);
            }
            $canvas['permissions'] = $permissions;

            if ($isOwner) {
                $canvas['role'] = 'admin';
            } elseif (in_array(CanvasPermissionsConstants::MANAGE_SETTINGS, $permissions) || in_array(CanvasPermissionsConstants::MANAGE_ROLES, $permissions)) {
                $canvas['role'] = 'admin';
            } elseif (in_array(CanvasPermissionsConstants::PLACE_PIXELS, $permissions)) {
                $canvas['role'] = 'editor';
            } else {
                $canvas['role'] = 'spectator';
            }

            $canvas['locked_requires_downgrade'] = false;
            $canvas['locked_reasons'] = [];

            if ($canvas['is_subscription_locked']) {
                $lockedReasons = [];
                if (!empty($canvas['locked_reasons'])) {
                    $lockedReasons = is_array($canvas['locked_reasons']) ? $canvas['locked_reasons'] : json_decode($canvas['locked_reasons'], true);
                }
                $canvas['locked_requires_downgrade'] = true;
                $canvas['locked_reasons'] = $lockedReasons ?: [];
                $canvas['role'] = 'spectator';
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
            $canvas['mode'] = $canvas['mode'] ?? 'offline';
            $canvas['is_online_active'] = (bool)($canvas['is_online_active'] ?? 0);
            $canvas['storage_bytes'] = (int)($canvas['storage_bytes'] ?? 0);

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

            $isOnline = ($canvas['mode'] === 'online' || $canvas['is_online_active']);
            $isProgressive = $isOnline ? Utils::isProgressiveLoadRequired($canvas['size']) : false;
            $canvas['progressive_load'] = $isProgressive;

            $redisKey = "canvas:{$canvasId}:state";
            $stateRaw = null;
            $redis = null;

            if ($isOnline) {
                try {
                    if (class_exists(RedisCache::class)) {
                        $redisInstance = new RedisCache();
                        $redis = $redisInstance->getClient();
                        
                        if ($redis) {
                            $redis->hMSet("canvas:{$canvasId}:config", [
                                'cooldown_batch' => $canvas['cooldown_pixels_batch'] ?? 5,
                                'cooldown_seconds' => $canvas['cooldown_seconds'] ?? 10,
                                'is_subscription_locked' => $canvas['is_subscription_locked'] ? 1 : 0
                            ]);
                        }
                    }
                } catch (Exception $e) {
                    Logger::error('Error setting canvas config in Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
                }
            }

            if (!$isProgressive) {
                if ($isOnline) {
                    try {
                        if ($redis && $redis->exists($redisKey)) {
                            $stateRaw = $redis->get($redisKey);
                        }
                    } catch (Exception $e) {
                        Logger::error('Error reading canvas from Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
                    }
                }

                if ($stateRaw === null || $stateRaw === false) {
                    $stateRaw = $this->canvasRepository->getSnapshot($canvasId);
                    if ($stateRaw && $redis && $isOnline) {
                        try {
                            $redis->set($redisKey, $stateRaw);
                        } catch (Exception $e) {}
                    }
                }

                if (!$stateRaw) {
                    $totalPixels = $width * $height;
                    $stateRaw = str_repeat(chr(0).chr(0).chr(0).chr(0), $totalPixels); 
                    if ($redis && $isOnline) {
                        try {
                            $redis->set($redisKey, $stateRaw);
                        } catch (Exception $e) {}
                    }
                }

                $canvas['state_base64'] = base64_encode(gzencode($stateRaw, 6));
                if (!$isOnline) {
                    $layersData = $this->canvasRepository->getLayersData($canvasId);
                    $canvas['layers_data'] = $layersData ?: null;
                } else {
                    $canvas['layers_data'] = null;
                }
            } else {
                $t1 = microtime(true);
                $canvas['state_base64'] = null;
                
                // For progressive load, just ensure Redis has the state initialized
                try {
                    if ($redis && !$redis->exists($redisKey)) {
                        $stateRaw = $this->canvasRepository->getSnapshot($canvasId);
                        if (!$stateRaw) {
                            $totalPixels = $width * $height;
                            $stateRaw = str_repeat(chr(0).chr(0).chr(0).chr(0), $totalPixels);
                        }
                        $redis->set($redisKey, $stateRaw);
                    }
                } catch (Exception $e) {
                    Logger::error('Error initializing progressive canvas in Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
                }
                $t2 = microtime(true);
            }

            $canvas['is_compressed'] = true;

            $tEnd = microtime(true);
            $result = ['success' => true, 'data' => $canvas, 'debug_timing' => ['total' => $tEnd - $t0, 'check_perms' => isset($t1) ? ($t1 - $t0) : null, 'redis_init' => isset($t2) ? ($t2 - $t1) : null]];
            if ($redis && !$isOnline) {
                try {
                    $redis->setex($cacheKey, CacheConstants::TTL_THIRTY_DAYS, json_encode($result)); // Cache permanente para lienzos offline
                    error_log("[DEBUG getCanvas] Saved metadata cache for key: $cacheKey");
                } catch (\Throwable $e) {
                    error_log("[DEBUG getCanvas] Exception saving cache: " . $e->getMessage());
                }
            }
            return $result;
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
        int $allowChat = 0,
        array $tags = [],
        ?string $templateId = null,
        int $allowCustomColors = 0
    ): array {
        try {
            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
                if (!isset($allSizes[$size])) {
                    $size = '64x64';
                }
                $requiredTier = $allSizes[$size]['tier'] ?? 0;
                if ($tier < $requiredTier) {
                    return [
                        'success' => false, 
                        'message' => __('err_plan_canvas_size'),
                        'error_code' => 'UPGRADE_REQUIRED'
                    ];
                }

                $sizeParts = explode('x', strtolower($size));
                $targetW = (int)$sizeParts[0];
                $targetH = isset($sizeParts[1]) ? (int)$sizeParts[1] : $targetW;
                $estimatedStorageBytes = max(4096, (int)(($targetW * $targetH * 4) * 0.05));

                if ($planLimits['max_storage_mb'] !== -1) {
                    $currentStorageMB = $this->canvasRepository->getUserStorageUsed($userId);
                    $newCanvasMB = $estimatedStorageBytes / (1024 * 1024);
                    if (($currentStorageMB + $newCanvasMB) > $planLimits['max_storage_mb']) {
                        return [
                            'success' => false, 
                            'message' => __('err_storage_limit_exceeded'),
                            'error_code' => 'STORAGE_LIMIT_EXCEEDED'
                        ];
                    }
                }

                if ($planLimits['max_members_per_canvas'] !== -1 && $limit > $planLimits['max_members_per_canvas']) {
                    $limit = $planLimits['max_members_per_canvas']; 
                }

                if ($paletteId !== 'default' && !SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')) {
                    $paletteId = 'default';
                }

                $maxPixelsPerBatch = $planLimits['max_pixels_per_batch'] ?? 5;
                if ($cooldownBatch > $maxPixelsPerBatch) {
                    $cooldownBatch = $maxPixelsPerBatch;
                }

                if ($requiredTier >= 3) {
                    $tier3Count = $this->canvasRepository->countUserTierCanvases($userId, 3);
                    if ($tier3Count >= 3) {
                        return [
                            'success' => false, 
                            'message' => __('err_canvas_tier3_limit_reached'),
                            'error_code' => 'TIER3_LIMIT_EXCEEDED'
                        ];
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
                'mode'                  => 'offline',
                'is_online_active'      => 0,
                'storage_bytes'         => $estimatedStorageBytes,
                'max_participants'      => $limit,
                'cooldown_pixels_batch' => max(1, $cooldownBatch),
                'cooldown_seconds'      => max(0, $cooldownSeconds),
                'allow_chat'            => $allowChat,
                'tags'                  => array_values(array_intersect($tags, [
                    'art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 
                    'community', 'nature', 'scifi', 'fantasy', 'music', 
                    'sports', 'popculture'
                ]))
            ];
            
            if (count($canvasData['tags']) > 8) {
                $canvasData['tags'] = array_slice($canvasData['tags'], 0, 8);
            }

            $canvasId = $this->canvasRepository->create($canvasData);

            $this->canvasRepository->addMember($canvasId, $userId, 4);

            // Update user storage bytes
            try {
                $this->userRepository->updateStorageUsed($userId, $estimatedStorageBytes);
            } catch (Exception $e) {}

            $hasTemplatePainted = false;

            // Pre-paint template if selected
            if ($templateId !== null) {
                try {
                    $templatePath = dirname(__DIR__, 3) . '/public/assets/config/canvas_templates.json';
                    if (file_exists($templatePath)) {
                        $templates = json_decode(file_get_contents($templatePath), true);
                        $foundTpl = null;
                        foreach ($templates as $tpl) {
                            if ($tpl['id'] === $templateId) {
                                $foundTpl = $tpl;
                                break;
                            }
                        }

                        if ($foundTpl && in_array($size, $foundTpl['sizes'])) {
                            $imgPath = $foundTpl['image_paths'][$size] ?? null;
                            if ($imgPath) {
                                $fullImgPath = dirname(__DIR__, 3) . '/public' . $imgPath;
                                if (file_exists($fullImgPath) && extension_loaded('gd')) {
                                    $ext = strtolower(pathinfo($fullImgPath, PATHINFO_EXTENSION));
                                    $img = null;
                                    if ($ext === 'png') {
                                        $img = @imagecreatefrompng($fullImgPath);
                                    } else if ($ext === 'jpg' || $ext === 'jpeg') {
                                        $img = @imagecreatefromjpeg($fullImgPath);
                                    }

                                    if ($img) {
                                        $targetW = 64;
                                        $targetH = 64;
                                        if (strpos($size, 'x') !== false) {
                                            list($targetW, $targetH) = explode('x', $size);
                                            $targetW = (int)$targetW;
                                            $targetH = (int)$targetH;
                                        }

                                        if (imagesx($img) === $targetW && imagesy($img) === $targetH) {
                                            $binaryData = '';
                                            for ($y = 0; $y < $targetH; $y++) {
                                                for ($x = 0; $x < $targetW; $x++) {
                                                    $rgbIndex = imagecolorat($img, $x, $y);
                                                    $colors = imagecolorsforindex($img, $rgbIndex);
                                                    $r = $colors['red'];
                                                    $g = $colors['green'];
                                                    $b = $colors['blue'];
                                                    $gdAlpha = $colors['alpha'];
                                                    $a = (int)round((127 - $gdAlpha) * 255 / 127);
                                                    $binaryData .= pack('C4', $r, $g, $b, $a);
                                                }
                                            }

                                            // Save to Database / S3
                                            $this->canvasRepository->saveSnapshot($canvasId, $binaryData);
                                            $hasTemplatePainted = true;

                                            // Enqueue for Python worker to generate thumbnail
                                            if (class_exists(RedisCache::class)) {
                                                $thumbRedis = (new RedisCache())->getClient();
                                                if ($thumbRedis) {
                                                    $thumbRedis->sAdd('canvases:pending_snapshots', (string)$canvasId);
                                                }
                                            }
                                        }
                                        imagedestroy($img);
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception $e) {
                    Logger::error('Error pre-painting canvas from template.', [
                        'canvas_id' => $canvasId,
                        'template_id' => $templateId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            if (!$hasTemplatePainted) {
                // Initialize blank snapshot in S3 / DB
                $blankBinary = str_repeat(chr(0).chr(0).chr(0).chr(0), $targetW * $targetH);
                $this->canvasRepository->saveSnapshot($canvasId, $blankBinary);
                if (class_exists(RedisCache::class)) {
                    $thumbRedis = (new RedisCache())->getClient();
                    if ($thumbRedis) {
                        $thumbRedis->sAdd('canvases:pending_snapshots', (string)$canvasId);
                    }
                }
            }

            try {
                $dbManager = new DatabaseManager();
                $redisCache = new RedisCache();
                $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository, $dbManager, $redisCache);
                $lockManager->evaluateUserCanvases($userId);
            } catch (Exception $e) {
                Logger::error('Error evaluating canvases on create.', ['error' => $e->getMessage()]);
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

    public function syncLocalCanvas(int $userId, array $params): array {
        $trans = function($k, $fallback) {
            return function_exists('__') ? (__($k) ?: $fallback) : $fallback;
        };

        try {
            $user = $this->userRepository->findById($userId);
            if (!$user) {
                return ['success' => false, 'message' => $trans('err_unauthorized', 'No autorizado')];
            }

            $tier = (int)($user['subscription_tier'] ?? 0);
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

            $size = $params['size'] ?? '64x64';
            $allSizes = Utils::getCanvasSizes();
            if (!isset($allSizes[$size])) {
                $size = '64x64';
            }

            $requiredTier = $allSizes[$size]['tier'] ?? 0;
            if ($tier < $requiredTier) {
                return [
                    'success' => false,
                    'message' => $trans('err_plan_canvas_size', 'El tamaño del lienzo requiere un plan superior'),
                    'error_code' => 'UPGRADE_REQUIRED'
                ];
            }

            $sizeParts = explode('x', strtolower($size));
            $targetW = (int)$sizeParts[0];
            $targetH = isset($sizeParts[1]) ? (int)$sizeParts[1] : $targetW;
            $expectedBytes = $targetW * $targetH * 4;

            $stateBase64 = $params['state_base64'] ?? '';
            $rawBinary = null;

            if (!empty($stateBase64)) {
                $decoded = base64_decode($stateBase64);
                if ($decoded) {
                    if (strlen($decoded) >= 2) {
                        $magic = substr($decoded, 0, 2);
                        if ($magic === "\x1f\x8b") {
                            $decompressed = @gzdecode($decoded);
                            if ($decompressed !== false) $decoded = $decompressed;
                        } elseif ($magic === "\x78\x9c" || $magic === "\x78\x01" || $magic === "\x78\xda" || $magic === "\x78\x5e") {
                            $decompressed = @gzuncompress($decoded);
                            if ($decompressed !== false) $decoded = $decompressed;
                        }
                    }
                    if (strlen($decoded) === $expectedBytes) {
                        $rawBinary = $decoded;
                    }
                }
            }

            if (!$rawBinary) {
                $rawBinary = str_repeat(chr(0).chr(0).chr(0).chr(0), $targetW * $targetH);
            }

            $actualSizeBytes = strlen($rawBinary);

            // Storage quota check
            if ($planLimits['max_storage_mb'] !== -1) {
                $currentStorageMB = $this->canvasRepository->getUserStorageUsed($userId);
                $newCanvasMB = $actualSizeBytes / (1024 * 1024);
                if (($currentStorageMB + $newCanvasMB) > $planLimits['max_storage_mb']) {
                    return [
                        'success' => false,
                        'message' => $trans('err_storage_limit_exceeded', 'Has alcanzado el límite de almacenamiento de tu cuenta.'),
                        'error_code' => 'STORAGE_LIMIT_EXCEEDED'
                    ];
                }
            }

            if ($requiredTier >= 3) {
                $tier3Count = $this->canvasRepository->countUserTierCanvases($userId, 3);
                if ($tier3Count >= 3) {
                    return [
                        'success' => false,
                        'message' => $trans('err_canvas_tier3_limit_reached', 'Has alcanzado el límite de lienzos ultra'),
                        'error_code' => 'TIER3_LIMIT_EXCEEDED'
                    ];
                }
            }

            $uuid = Utils::generateUUID();
            $validPalettes = $this->getValidPalettes();
            $paletteId = $params['palette_id'] ?? 'default';
            $paletteId = in_array($paletteId, $validPalettes) ? $paletteId : 'default';
            if ($paletteId !== 'default' && !SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')) {
                $paletteId = 'default';
            }

            $validPrivacies = [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE];
            $privacy = in_array($params['privacy'] ?? '', $validPrivacies) ? $params['privacy'] : DB::PRIVACY_PRIVATE;

            $tags = isset($params['tags']) && is_array($params['tags']) ? $params['tags'] : [];
            $allowedTags = ['art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 'community', 'nature', 'scifi', 'fantasy', 'music', 'sports', 'popculture'];
            $cleanTags = array_slice(array_values(array_intersect($tags, $allowedTags)), 0, 8);

            $name = trim($params['name'] ?? '');
            if (empty($name)) {
                $name = 'Canvas_' . time();
            }

            $canvasData = [
                'uuid'                  => $uuid,
                'owner_id'              => $userId,
                'name'                  => $name,
                'privacy'               => $privacy,
                'requires_approval'     => 0,
                'size'                  => $size,
                'palette_id'            => $paletteId,
                'mode'                  => 'offline',
                'is_online_active'      => 0,
                'storage_bytes'         => $actualSizeBytes,
                'max_participants'      => 10,
                'cooldown_pixels_batch' => 5,
                'cooldown_seconds'      => 10,
                'allow_chat'            => 0,
                'tags'                  => $cleanTags
            ];

            $canvasId = $this->canvasRepository->create($canvasData);
            $this->canvasRepository->addMember($canvasId, $userId, 4);

            // Save Snapshot binary
            $this->canvasRepository->saveSnapshot($canvasId, $rawBinary);

            // Save layers if provided
            $layersData = $params['layers_data'] ?? null;
            if (!empty($layersData)) {
                $this->canvasRepository->saveLayersData($canvasId, $layersData);
            }

            // Update user storage bytes
            try {
                $this->userRepository->updateStorageUsed($userId, $actualSizeBytes);
            } catch (\Throwable $e) {}

            // Enqueue snapshot generation and clean Redis cache
            if (class_exists(RedisCache::class)) {
                $redis = (new RedisCache())->getClient();
                if ($redis) {
                    $redis->del("canvas:{$canvasId}:state");
                    $redis->del("canvas:{$canvasId}:layers");
                    $redis->sAdd('canvases:pending_snapshots', (string)$canvasId);
                    (new \App\Core\System\CacheInvalidator($redis))->canvas($canvasId, $uuid);
                }
            }

            try {
                $dbManager = new DatabaseManager();
                $redisCache = new RedisCache();
                $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository, $dbManager, $redisCache);
                $lockManager->evaluateUserCanvases($userId);
            } catch (\Throwable $e) {}

            return [
                'success' => true,
                'message' => $trans('msg_canvas_synced_success', 'Lienzo sincronizado con la nube exitosamente.'),
                'data' => [
                    'id' => $canvasId,
                    'uuid' => $uuid,
                    'name' => $name,
                    'size' => $size,
                    'local_uuid' => $params['local_uuid'] ?? null
                ]
            ];
        } catch (Exception $e) {
            Logger::error('Error during local canvas synchronization.', [
                'user_id' => $userId,
                'exception' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => $trans('err_database', 'Error en la base de datos')];
        }
    }

    public function updateCanvas(int $userId, int $canvasId, array $data): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $isOwner = ($canvas['owner_id'] == $userId);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if (!empty($canvas['is_subscription_locked'])) {
                return ['success' => false, 'message' => __('err_canvas_locked')];
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
            
            $owner = $canvas['owner_id'] !== null ? $this->userRepository->findById($canvas['owner_id']) : null;
            $tier = $owner ? ($owner['subscription_tier'] ?? 0) : 3;
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
            $maxPixelsPerBatch = $planLimits['max_pixels_per_batch'] ?? 5;

            $data['cooldown_pixels_batch'] = isset($data['cooldown_pixels_batch']) ? min($maxPixelsPerBatch, max(1, (int)$data['cooldown_pixels_batch'])) : ($canvas['cooldown_pixels_batch'] ?? 5);
            $data['cooldown_seconds'] = isset($data['cooldown_seconds']) ? max(0, (int)$data['cooldown_seconds']) : ($canvas['cooldown_seconds'] ?? 10);
            
            if (isset($data['allow_chat'])) {
                $data['allow_chat'] = (int)$data['allow_chat'];
            }

            if (isset($data['tags']) && is_array($data['tags'])) {
                $data['tags'] = array_values(array_intersect($data['tags'], [
                    'art', 'gaming', 'anime', 'flags', 'memes', 'pixelart', 
                    'community', 'nature', 'scifi', 'fantasy', 'music', 
                    'sports', 'popculture'
                ]));
                if (count($data['tags']) > 8) {
                    $data['tags'] = array_slice($data['tags'], 0, 8);
                }
            } else {
                $data['tags'] = null;
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

    public function downgradeCanvasToBasic(int $userId, string $uuid, string $password = '', ?string $credential = null): array {
        try {
            $user = $this->userRepository->findById($userId);
            if (!$user) {
                return ['success' => false, 'message' => __('err_user_not_found')];
            }
            if (!\App\Core\Helpers\Utils::verifyUserIdentity($user, ['password' => $password, 'credential' => $credential])) {
                return ['success' => false, 'message' => !empty($credential) ? __('auth.google_verification_failed') : __('err_invalid_password')];
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
                $dbManager = new DatabaseManager();
                $redisCache = new RedisCache();
                $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository, $dbManager, $redisCache);
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

    public function deleteCanvas(?int $userId, string $uuid, string $password = '', ?string $credential = null): array {
        try {
            if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];

            $user = $this->userRepository->findById($userId);
            if (!$user) return ['success' => false, 'message' => __('err_unauthorized')];

            if (!\App\Core\Helpers\Utils::verifyUserIdentity($user, ['password' => $password, 'credential' => $credential])) {
                return ['success' => false, 'message' => !empty($credential) ? __('auth.google_verification_failed') : __('err_invalid_password')];
            }

            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $isOwner = ($canvas['owner_id'] == $userId);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            // Soft-delete: mover a la papelera (no liberar storage aún)
            $deleted = $this->canvasRepository->deleteCanvasByUuid($uuid);

            if ($deleted) {
                // Limpiar caché de Redis del canvas
                try {
                    if (class_exists(RedisCache::class)) {
                        $redisInstance = new RedisCache();
                        $redis = $redisInstance->getClient();
                        if ($redis) {
                            $redis->del("canvas:{$canvas['id']}:state");
                            $redis->del("canvas:{$canvas['id']}:config");
                            $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESET . $canvas['id']);
                            $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESIZE . $canvas['id']);
                        }
                    }
                } catch (Exception $e) {}

                if ($canvas['owner_id'] !== null) {
                    try {
                        $dbManager = new DatabaseManager();
                        $redisCache = new RedisCache();
                        $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository, $dbManager, $redisCache);
                        $lockManager->evaluateUserCanvases($canvas['owner_id']);
                    } catch (Exception $e) {
                        Logger::error('Error evaluating canvases on delete.', ['error' => $e->getMessage()]);
                    }
                }

                return ['success' => true, 'message' => __('msg_canvas_trashed')];
            }

            return ['success' => false, 'message' => __('err_canvas_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error deleting single canvas.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deleteUserCanvases(int $userId, array $canvasIds, string $password = '', ?string $credential = null): array {
        try {
            if (empty($canvasIds)) {
                return ['success' => false, 'message' => __('err_no_canvases_selected')];
            }

            $user = $this->userRepository->findById($userId);
            if (!$user) return ['success' => false, 'message' => __('err_unauthorized')];

            if (!\App\Core\Helpers\Utils::verifyUserIdentity($user, ['password' => $password, 'credential' => $credential])) {
                return ['success' => false, 'message' => !empty($credential) ? __('auth.google_verification_failed') : __('err_invalid_password')];
            }

            // Soft-delete: mover a papelera (no liberar storage aún)
            $deleted = $this->canvasRepository->deleteCanvases($canvasIds, $userId);

            if ($deleted) {
                // Limpiar caché de Redis para cada canvas
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

                return ['success' => true, 'message' => __('msg_canvases_trashed')];
            }

            return ['success' => false, 'message' => __('err_canvases_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error deleting canvases.', ['user_id' => $userId, 'exception' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getCanvasChunks(int $canvasId, array $requestedChunks): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $sizeStr = strtolower($canvas['size']);
            if (strpos($sizeStr, 'x') !== false) {
                $parts = explode('x', $sizeStr);
                $boardW = (int)$parts[0];
                $boardH = isset($parts[1]) ? (int)$parts[1] : $boardW;
            } else {
                $boardW = (int)$sizeStr;
                $boardH = $boardW;
            }

            $chunkSize = 512;
            $redisKey = "canvas:{$canvasId}:state";
            $responseChunks = [];
            $validChunkKeys = [];

            foreach ($requestedChunks as $chunkKey) {
                if (is_string($chunkKey) && strpos($chunkKey, ',') !== false) {
                    $validChunkKeys[] = $chunkKey;
                }
            }

            if (empty($validChunkKeys)) {
                return [
                    'success' => true,
                    'data' => [
                        'canvas_id' => $canvasId,
                        'chunk_size' => $chunkSize,
                        'chunks' => []
                    ]
                ];
            }

            $extractedViaRedis = false;

            if (class_exists(RedisCache::class)) {
                try {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();

                    if ($redis && $redis->exists($redisKey)) {
                        $totalSize = $boardW * $boardH * 4;
                        if ($totalSize <= 16 * 1024 * 1024 || count($validChunkKeys) >= 2) {
                            $stateRaw = $redis->get($redisKey);
                            if ($stateRaw) {
                                foreach ($validChunkKeys as $chunkKey) {
                                    list($cx, $cy) = explode(',', $chunkKey);
                                    $cx = (int)$cx;
                                    $cy = (int)$cy;

                                    $startX = $cx * $chunkSize;
                                    $startY = $cy * $chunkSize;

                                    if ($startX >= $boardW || $startY >= $boardH || $startX < 0 || $startY < 0) continue;

                                    $actualW = min($chunkSize, $boardW - $startX);
                                    $actualH = min($chunkSize, $boardH - $startY);

                                    $chunkBuffer = '';
                                    for ($y = 0; $y < $actualH; $y++) {
                                        $offset = (($startY + $y) * $boardW + $startX) * 4;
                                        $length = $actualW * 4;
                                        $chunkBuffer .= substr($stateRaw, $offset, $length);
                                    }

                                    $responseChunks[$chunkKey] = base64_encode(gzencode($chunkBuffer, 1));
                                }
                                $extractedViaRedis = true;
                            }
                        }

                        if (!$extractedViaRedis) {
                            $luaScript = <<<LUA
local redisKey = KEYS[1]
local boardW = tonumber(ARGV[1])
local boardH = tonumber(ARGV[2])
local chunkSize = tonumber(ARGV[3])
local res = {}

for i = 4, #ARGV do
    local chunkKey = ARGV[i]
    local comma = string.find(chunkKey, ",")
    if comma then
        local cx = tonumber(string.sub(chunkKey, 1, comma - 1))
        local cy = tonumber(string.sub(chunkKey, comma + 1))
        local startX = cx * chunkSize
        local startY = cy * chunkSize
        
        if startX < boardW and startY < boardH and startX >= 0 and startY >= 0 then
            local actualW = math.min(chunkSize, boardW - startX)
            local actualH = math.min(chunkSize, boardH - startY)
            local rowLen = actualW * 4
            local rows = {}
            for y = 0, actualH - 1 do
                local offset = ((startY + y) * boardW + startX) * 4
                local line = redis.call('GETRANGE', redisKey, offset, offset + rowLen - 1)
                rows[#rows + 1] = line
            end
            res[#res + 1] = chunkKey
            res[#res + 1] = table.concat(rows)
        end
    end
end
return res
LUA;

                            $chunkBatches = array_chunk($validChunkKeys, 8);
                            $extractedViaRedis = true;
                            
                            foreach ($chunkBatches as $batch) {
                                $evalArgs = array_merge([$redisKey, $boardW, $boardH, $chunkSize], $batch);
                                $luaResult = $redis->eval($luaScript, $evalArgs, 1);

                                if (is_array($luaResult)) {
                                    $count = count($luaResult);
                                    for ($i = 0; $i < $count; $i += 2) {
                                        $cKey = $luaResult[$i];
                                        $cBuffer = $luaResult[$i + 1] ?? '';
                                        $responseChunks[$cKey] = base64_encode(gzencode($cBuffer, 1));
                                    }
                                } else {
                                    $extractedViaRedis = false;
                                    break;
                                }
                            }
                        }
                    }
                } catch (Exception $e) {
                    Logger::error('Error extracting chunks via Redis Lua script or in-memory fetch.', [
                        'canvas_id' => $canvasId,
                        'error' => $e->getMessage()
                    ]);
                    $extractedViaRedis = false;
                }
            }

            if (!$extractedViaRedis) {
                

                $stateRaw = null;
                if (class_exists(RedisCache::class)) {
                    try {
                        $redis = (new RedisCache())->getClient();
                        if ($redis && $redis->exists($redisKey)) {
                            $stateRaw = $redis->get($redisKey);
                        }
                    } catch (Exception $e) {}
                }

                if (!$stateRaw) {
                    $stateRaw = $this->canvasRepository->getSnapshot($canvasId);
                    if ($stateRaw && class_exists(RedisCache::class)) {
                        try {
                            $r = (new RedisCache())->getClient();
                            if ($r) $r->set($redisKey, $stateRaw);
                        } catch (\Throwable $e) {}
                    }
                }

                if (!$stateRaw) {
                    $totalPixels = $boardW * $boardH;
                    $stateRaw = str_repeat(chr(0).chr(0).chr(0).chr(0), $totalPixels);
                }

                foreach ($validChunkKeys as $chunkKey) {
                    list($cx, $cy) = explode(',', $chunkKey);
                    $cx = (int)$cx;
                    $cy = (int)$cy;

                    $startX = $cx * $chunkSize;
                    $startY = $cy * $chunkSize;

                    if ($startX >= $boardW || $startY >= $boardH || $startX < 0 || $startY < 0) continue;

                    $actualW = min($chunkSize, $boardW - $startX);
                    $actualH = min($chunkSize, $boardH - $startY);

                    $chunkBuffer = '';
                    for ($y = 0; $y < $actualH; $y++) {
                        $offset = (($startY + $y) * $boardW + $startX) * 4;
                        $length = $actualW * 4;
                        $chunkBuffer .= substr($stateRaw, $offset, $length);
                    }

                    $responseChunks[$chunkKey] = base64_encode(gzencode($chunkBuffer, 1));
                }
            }

            return [
                'success' => true,
                'data' => [
                    'canvas_id' => $canvasId,
                    'chunk_size' => $chunkSize,
                    'chunks' => $responseChunks
                ]
            ];
        } catch (Exception $e) {
            Logger::error('Error getting canvas chunks.', [
                'canvas_id' => $canvasId,
                'exception' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function updateCanvasChatStatus(int $userId, int $canvasId, int $allowChat): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            if ((int)$canvas['owner_id'] !== $userId) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($allowChat === 1) {
                $owner = $this->userRepository->findById($userId);
                $tier = $owner['subscription_tier'] ?? 0;
                $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
                $hasLiveChat = SubscriptionPlanConstants::hasFeature($tier, 'chat_restriction') 
                            || SubscriptionPlanConstants::hasFeature($tier, 'allow_live_chat') 
                            || !empty($planLimits['allow_live_chat']) 
                            || !empty($planLimits['feat_chat_restriction']);
                
                if (!$hasLiveChat) {
                    return ['success' => false, 'message' => __('err_requires_pro') ?: 'Esta función requiere un plan Pro o superior.'];
                }
            }

            $updated = $this->canvasRepository->updateChatStatus($canvasId, $allowChat);
            if ($updated) {
                if (class_exists(RedisCache::class)) {
                    try {
                        $redis = (new RedisCache())->getClient();
                        if ($redis) {
                            $redis->hSet("canvas:{$canvasId}:config", "allow_chat", (string)$allowChat);
                        }
                    } catch (\Throwable $ex) {}
                }
                return ['success' => true, 'allow_chat' => $allowChat];
            }

            return ['success' => false, 'message' => __('err_database')];
        } catch (Exception $e) {
            Logger::error('Error during canvas chat status update.', [
                'canvas_id' => $canvasId,
                'exception' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function activateOnline(int $userId, int $canvasId): array {
        $redisCache = class_exists(RedisCache::class) ? new RedisCache() : null;
        $lockKey = "user:{$userId}:online_activation_lock";

        $action = function() use ($userId, $canvasId, $redisCache) {
            $dbManager = new DatabaseManager();
            $db = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
            $db->beginTransaction();

            try {
                $stmt = $db->prepare("SELECT * FROM canvases WHERE id = ? FOR UPDATE");
                $stmt->execute([$canvasId]);
                $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

                if (!$canvas) {
                    $db->rollBack();
                    return ['success' => false, 'message' => __('err_canvas_not_found')];
                }
                if ((int)$canvas['owner_id'] !== $userId) {
                    $db->rollBack();
                    return ['success' => false, 'message' => __('err_unauthorized')];
                }

                $user = $this->userRepository->findById($userId);
                $tier = $user['subscription_tier'] ?? 0;
                $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
                $maxOnlineCanvases = $planLimits['max_online_canvases'] ?? $planLimits['max_canvases'] ?? 1;

                if ($maxOnlineCanvases !== -1) {
                    $stmtCount = $db->prepare("SELECT COUNT(*) FROM canvases WHERE owner_id = ? AND is_online_active = 1 AND id != ?");
                    $stmtCount->execute([$userId, $canvasId]);
                    $currentOnlineCount = (int)$stmtCount->fetchColumn();

                    if ($currentOnlineCount >= $maxOnlineCanvases && empty($canvas['is_online_active'])) {
                        $db->rollBack();
                        return [
                            'success' => false,
                            'message' => __('err_online_slots_exceeded') ?: 'Has alcanzado el límite de salas online de tu plan de suscripción.',
                            'error_code' => 'ONLINE_LIMIT_EXCEEDED',
                            'http_code' => \App\Core\System\HttpConstants::CONFLICT
                        ];
                    }
                }

                $stateRaw = $this->canvasRepository->getSnapshot($canvasId);
                if (!$stateRaw) {
                    $sizeStr = strtolower($canvas['size'] ?? '64x64');
                    $parts = explode('x', $sizeStr);
                    $w = (int)$parts[0];
                    $h = isset($parts[1]) ? (int)$parts[1] : $w;
                    $stateRaw = str_repeat(chr(0).chr(0).chr(0).chr(0), $w * $h);
                }

                if ($redisCache) {
                    $redis = $redisCache->getClient();
                    if ($redis) {
                        $redis->set("canvas:{$canvasId}:state", $stateRaw);
                        $redis->hMSet("canvas:{$canvasId}:config", [
                            'cooldown_batch' => $canvas['cooldown_pixels_batch'] ?? 5,
                            'cooldown_seconds' => $canvas['cooldown_seconds'] ?? 10,
                            'is_subscription_locked' => !empty($canvas['is_subscription_locked']) ? 1 : 0
                        ]);
                        $redis->publish("admin:canvas_events", json_encode([
                            'type' => 'canvas_mode_changed',
                            'canvas_id' => $canvasId,
                            'mode' => 'online',
                            'is_online_active' => 1
                        ]));
                    }
                }

                $stmt = $db->prepare("UPDATE canvases SET `mode` = 'online', `is_online_active` = 1, `last_online_at` = NOW() WHERE id = ?");
                $stmt->execute([$canvasId]);
                $db->commit();

                try {
                    if (class_exists(\App\Config\Search\TypesenseManager::class)) {
                        $tsManager = new \App\Config\Search\TypesenseManager();
                        $tsClient = $tsManager->getClient();
                        if ($tsClient && ($canvas['privacy'] ?? '') === 'public') {
                            $document = [
                                'id'         => (string)$canvasId,
                                'uuid'       => $canvas['uuid'],
                                'name'       => $canvas['name'],
                                'owner_id'   => (int)$userId,
                                'privacy'    => 'public',
                                'created_at' => !empty($canvas['created_at']) ? strtotime($canvas['created_at']) : time()
                            ];
                            $tsClient->collections['canvases']->documents->upsert($document);
                        }
                    }
                } catch (\Throwable $tsEx) {}

                try {
                    if ($redisCache) {
                        $redis = $redisCache->getClient();
                        if ($redis) {
                            (new \App\Core\System\CacheInvalidator($redis))->canvas($canvasId, $canvas['uuid'] ?? null);
                            (new \App\Core\System\CacheInvalidator($redis))->userCanvasList($userId);
                        }
                    }
                } catch (\Throwable $ex) {}

                return ['success' => true, 'message' => __('msg_canvas_online_activated') ?: 'Lienzo activado en modo Online con éxito.'];
            } catch (\Throwable $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                Logger::error('Error activating canvas online.', ['canvas_id' => $canvasId, 'user_id' => $userId, 'error' => $e->getMessage()]);
                return ['success' => false, 'message' => __('err_database')];
            }
        };

        if ($redisCache && $redisCache->getClient()) {
            return $redisCache->executeWithLock($lockKey, 5, $action);
        }

        return $action();
    }

    public function deactivateOnline(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            if ((int)$canvas['owner_id'] !== $userId) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $dbManager = new DatabaseManager();
            $db = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);

            if (class_exists(RedisCache::class)) {
                $redis = (new RedisCache())->getClient();
                if ($redis) {
                    $redis->publish("admin:canvas_events", json_encode([
                        'type' => 'canvas_closing',
                        'canvas_id' => $canvasId
                    ]));

                    $stateRaw = $redis->get("canvas:{$canvasId}:state");
                    if ($stateRaw) {
                        $this->canvasRepository->saveSnapshot($canvasId, $stateRaw);
                        $newSizeBytes = strlen($stateRaw);
                        $oldSizeBytes = (int)($canvas['storage_bytes'] ?? 0);
                        $diffBytes = $newSizeBytes - $oldSizeBytes;
                        if ($diffBytes !== 0 && !empty($canvas['owner_id'])) {
                            try {
                                $this->userRepository->updateStorageUsed((int)$canvas['owner_id'], $diffBytes);
                            } catch (Exception $e) {}
                        }
                        $stmtStorage = $db->prepare("UPDATE canvases SET `storage_bytes` = ? WHERE id = ?");
                        $stmtStorage->execute([$newSizeBytes, $canvasId]);
                    }
                    $redis->del("canvas:{$canvasId}:state");
                    $redis->del("canvas:{$canvasId}:config");
                    $redis->publish("admin:canvas_events", json_encode([
                        'type' => 'canvas_mode_changed',
                        'canvas_id' => $canvasId,
                        'mode' => 'offline',
                        'is_online_active' => 0
                    ]));
                }
            }

            $stmt = $db->prepare("UPDATE canvases SET `mode` = 'offline', `is_online_active` = 0 WHERE id = ?");
            $stmt->execute([$canvasId]);

            try {
                if (class_exists(\App\Config\Search\TypesenseManager::class)) {
                    $tsManager = new \App\Config\Search\TypesenseManager();
                    $tsClient = $tsManager->getClient();
                    if ($tsClient) {
                        try {
                            $tsClient->collections['canvases']->documents[(string)$canvasId]->delete();
                        } catch (\Throwable $t) {}
                    }
                }
            } catch (\Throwable $tsEx) {}

            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis) {
                        (new \App\Core\System\CacheInvalidator($redis))->canvas($canvasId, $canvas['uuid'] ?? null);
                        (new \App\Core\System\CacheInvalidator($redis))->userCanvasList($userId);
                    }
                }
            } catch (\Throwable $ex) {}

            return ['success' => true, 'message' => __('msg_canvas_offline_deactivated') ?: 'Lienzo cambiado a modo Estudio (Offline) con éxito.'];
        } catch (Exception $e) {
            Logger::error('Error deactivating canvas online.', ['canvas_id' => $canvasId, 'user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function saveOfflineState(int $userId, int $canvasId, string $stateBase64, $layersData = null): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            if (($canvas['mode'] ?? 'offline') === 'online' || !empty($canvas['is_online_active'])) {
                return [
                    'success' => false,
                    'message' => __('err_canvas_is_online_mode') ?: 'El lienzo está activo en modo Online. No se pueden aplicar guardados offline.',
                    'error_code' => 'CANVAS_ONLINE_CONFLICT',
                    'http_code' => \App\Core\System\HttpConstants::CONFLICT
                ];
            }

            $isOwner = ((int)$canvas['owner_id'] === $userId);
            if (!$isOwner) {
                $hasPerm = $this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::PLACE_PIXELS);
                if (!$hasPerm) {
                    return ['success' => false, 'message' => __('err_unauthorized')];
                }
            }

            $rawBinary = base64_decode($stateBase64);
            if (!$rawBinary) {
                return ['success' => false, 'message' => __('err_invalid_data')];
            }

            if (strlen($rawBinary) >= 2) {
                $magic = substr($rawBinary, 0, 2);
                if ($magic === "\x1f\x8b") {
                    $decompressed = @gzdecode($rawBinary);
                    if ($decompressed !== false) {
                        $rawBinary = $decompressed;
                    }
                } elseif ($magic === "\x78\x9c" || $magic === "\x78\x01" || $magic === "\x78\xda" || $magic === "\x78\x5e") {
                    $decompressed = @gzuncompress($rawBinary);
                    if ($decompressed !== false) {
                        $rawBinary = $decompressed;
                    }
                }
            }

            $sizeParts = explode('x', strtolower($canvas['size'] ?? '64x64'));
            $targetW = (int)$sizeParts[0];
            $targetH = isset($sizeParts[1]) ? (int)$sizeParts[1] : $targetW;
            $expectedBytes = $targetW * $targetH * 4;

            if (strlen($rawBinary) !== $expectedBytes) {
                return [
                    'success' => false, 
                    'message' => __('err_invalid_dimensions') ?: 'Las dimensiones de los datos no coinciden con el tamaño del lienzo.'
                ];
            }

            $this->canvasRepository->saveSnapshot($canvasId, $rawBinary);

            if (!empty($layersData)) {
                $this->canvasRepository->saveLayersData($canvasId, $layersData);
            }

            $newSizeBytes = strlen($rawBinary);
            $oldSizeBytes = (int)($canvas['storage_bytes'] ?? 0);
            $diffBytes = $newSizeBytes - $oldSizeBytes;

            $dbManager = new DatabaseManager();
            $db = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
            $stmt = $db->prepare("UPDATE canvases SET `storage_bytes` = ? WHERE id = ?");
            $stmt->execute([$newSizeBytes, $canvasId]);

            if ($diffBytes !== 0 && !empty($canvas['owner_id'])) {
                try {
                    $this->userRepository->updateStorageUsed((int)$canvas['owner_id'], $diffBytes);
                } catch (Exception $e) {}
            }

            if (class_exists(RedisCache::class)) {
                $redis = (new RedisCache())->getClient();
                if ($redis) {
                    $redis->del("canvas:{$canvasId}:state");
                    $redis->del("canvas:{$canvasId}:layers");
                    $redis->sAdd('canvases:pending_snapshots', (string)$canvasId);
                    (new \App\Core\System\CacheInvalidator($redis))->canvas($canvasId, $canvas['uuid'] ?? null);
                }
            }

            return ['success' => true, 'message' => __('msg_state_saved') ?: 'Estado guardado con éxito.'];
        } catch (Exception $e) {
            Logger::error('Error saving offline state.', ['canvas_id' => $canvasId, 'user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    // =========================================================================
    // PAPELERA DE RECICLAJE
    // =========================================================================

    public function getTrash(?int $userId, int $limit = 50, int $offset = 0): array {
        if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];
        try {
            $canvases = $this->canvasRepository->getTrashCanvases($userId, $limit, $offset);
            $total = $this->canvasRepository->countTrashCanvases($userId);
            $retentionDays = 30;
            $now = new DateTime();

            $formatted = array_map(function($canvas) use ($now, $retentionDays) {
                $deletedAt = new DateTime($canvas['deleted_at']);
                $expiresAt = (clone $deletedAt)->modify("+{$retentionDays} days");
                $daysLeft = max(0, (int)$now->diff($expiresAt)->days);
                return [
                    'id'           => $canvas['id'],
                    'uuid'         => $canvas['uuid'],
                    'name'         => $canvas['name'],
                    'privacy'      => $canvas['privacy'],
                    'size'         => $canvas['size'],
                    'storage_bytes'=> (int)($canvas['storage_bytes'] ?? 0),
                    'created_at'   => $canvas['created_at'],
                    'deleted_at'   => $canvas['deleted_at'],
                    'days_left'    => $daysLeft,
                ];
            }, $canvases);

            return ['success' => true, 'data' => $formatted, 'total' => $total];
        } catch (Exception $e) {
            Logger::error('Error getting trash canvases.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function restoreCanvas(?int $userId, string $uuid): array {
        if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];
        try {
            $restored = $this->canvasRepository->restoreCanvas($uuid, $userId);
            if ($restored) {
                // Re-evaluar locks de suscripción
                try {
                    $dbManager = new DatabaseManager();
                    $redisCache = new RedisCache();
                    $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository, $dbManager, $redisCache);
                    $lockManager->evaluateUserCanvases($userId);
                } catch (Exception $e) {
                    Logger::error('Error evaluating canvases on restore.', ['error' => $e->getMessage()]);
                }
                return ['success' => true, 'message' => __('msg_canvas_restored')];
            }
            return ['success' => false, 'message' => __('err_canvas_restore_failed')];
        } catch (Exception $e) {
            Logger::error('Error restoring canvas.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function restoreUserCanvases(?int $userId, array $canvasIds): array {
        if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];
        try {
            if (empty($canvasIds)) {
                return ['success' => false, 'message' => __('err_no_canvases_selected')];
            }

            $result = $this->canvasRepository->restoreCanvases($canvasIds, $userId);
            if (($result['count'] ?? 0) > 0) {
                // Re-evaluar locks de suscripción
                try {
                    $dbManager = new DatabaseManager();
                    $redisCache = new RedisCache();
                    $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository, $dbManager, $redisCache);
                    $lockManager->evaluateUserCanvases($userId);
                } catch (Exception $e) {
                    Logger::error('Error evaluating canvases on batch restore.', ['error' => $e->getMessage()]);
                }
                return ['success' => true, 'message' => __('msg_canvas_restored'), 'data' => $result];
            }
            return ['success' => false, 'message' => __('err_canvas_restore_failed')];
        } catch (Exception $e) {
            Logger::error('Error restoring canvases batch.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function permanentDeleteCanvas(?int $userId, string $uuid, string $password = '', ?string $credential = null): array {
        if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];
        try {
            $user = $this->userRepository->findById($userId);
            if (!$user) return ['success' => false, 'message' => __('err_unauthorized')];

            if (!\App\Core\Helpers\Utils::verifyUserIdentity($user, ['password' => $password, 'credential' => $credential])) {
                return ['success' => false, 'message' => !empty($credential) ? __('auth.google_verification_failed') : __('err_invalid_password')];
            }

            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas || $canvas['deleted_at'] === null) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            if ((int)$canvas['owner_id'] !== $userId) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $storageBytes = (int)($canvas['storage_bytes'] ?? 0);
            $deleted = $this->canvasRepository->permanentDeleteCanvas($uuid, $userId);

            if ($deleted) {
                // Liberar storage ahora sí (borrado definitivo)
                if ($storageBytes > 0) {
                    try { $this->userRepository->updateStorageUsed($userId, -$storageBytes); } catch (Exception $e) {}
                }
                // Limpiar Redis
                try {
                    if (class_exists(RedisCache::class)) {
                        $redisInstance = new RedisCache();
                        $redis = $redisInstance->getClient();
                        if ($redis) {
                            $redis->del("canvas:{$canvas['id']}:state");
                            $redis->del("canvas:{$canvas['id']}:config");
                            $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESET . $canvas['id']);
                            $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESIZE . $canvas['id']);
                        }
                    }
                } catch (Exception $e) {}
                // Re-evaluar locks
                try {
                    $dbManager = new DatabaseManager();
                    $redisCache = new RedisCache();
                    $lockManager = new CanvasLockManager($this->canvasRepository, $this->userRepository, $dbManager, $redisCache);
                    $lockManager->evaluateUserCanvases($userId);
                } catch (Exception $e) {}

                return ['success' => true, 'message' => __('msg_canvas_permanent_deleted')];
            }
            return ['success' => false, 'message' => __('err_canvas_permanent_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error permanently deleting canvas.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function permanentDeleteUserCanvases(?int $userId, array $canvasIds, string $password = '', ?string $credential = null): array {
        if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];
        try {
            if (empty($canvasIds)) return ['success' => false, 'message' => __('err_no_canvases_selected')];

            $user = $this->userRepository->findById($userId);
            if (!$user) return ['success' => false, 'message' => __('err_unauthorized')];

            if (!\App\Core\Helpers\Utils::verifyUserIdentity($user, ['password' => $password, 'credential' => $credential])) {
                return ['success' => false, 'message' => !empty($credential) ? __('auth.google_verification_failed') : __('err_invalid_password')];
            }

            // Calcular storage a liberar antes de borrar
            $totalBytesToDeduct = 0;
            foreach ($canvasIds as $cid) {
                $c = $this->canvasRepository->getById((int)$cid);
                if ($c && (int)($c['owner_id'] ?? 0) === $userId && !empty($c['deleted_at'])) {
                    $totalBytesToDeduct += (int)($c['storage_bytes'] ?? 0);
                }
            }

            $deleted = $this->canvasRepository->permanentDeleteCanvases($canvasIds, $userId);

            if ($deleted) {
                // Liberar storage
                if ($totalBytesToDeduct > 0) {
                    try { $this->userRepository->updateStorageUsed($userId, -$totalBytesToDeduct); } catch (Exception $e) {}
                }
                // Limpiar Redis
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
                return ['success' => true, 'message' => __('msg_canvases_permanent_deleted')];
            }
            return ['success' => false, 'message' => __('err_canvas_permanent_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error permanently deleting canvases.', ['user_id' => $userId, 'exception' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
