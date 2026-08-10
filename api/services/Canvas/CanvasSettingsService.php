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

class CanvasSettingsService {
    private $canvasRepository;
    private $userRepository;

    public function __construct(CanvasRepositoryInterface $canvasRepository, UserRepositoryInterface $userRepository) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
}

    public function resizeCanvas(int $userId, int $canvasId, string $newSize): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $isOwner = ($canvas['owner_id'] === $userId);
            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
            if (!isset($allSizes[$newSize])) {
                return ['success' => false, 'message' => __('err_invalid_canvas_size')];
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = (int)($owner['subscription_tier'] ?? 0);
                $requiredTier = (int)($allSizes[$newSize]['tier'] ?? 0);
                
                if ($tier < $requiredTier) {
                    return ['success' => false, 'message' => __('err_plan_canvas_size')];
                }

                $currentTier = (int)($allSizes[$canvas['size']]['tier'] ?? 0);
                if ($requiredTier >= 3 && $currentTier < 3) {
                    $tier3Count = $this->canvasRepository->countUserTierCanvases($canvas['owner_id'], 3);
                    if ($tier3Count >= 3) {
                        return ['success' => false, 'message' => __('err_canvas_tier3_limit_reached')];
                    }
                }
            }

            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                
                if ($redis) {
                    $lockKey = "canvas:{$canvasId}:resize_lock";
                    $redis->setex($lockKey, 60, "1"); 
                    
                    $task = [
                        'canvas_id' => $canvasId,
                        'old_size'  => $canvas['size'],
                        'new_size'  => $newSize
                    ];
                    
                    $redis->lpush("canvases:pending_resizes", json_encode($task));
                    
                    $redis->publish("admin:canvas_events", json_encode([
                        'type' => 'canvas_locked_resize',
                        'canvas_id' => $canvasId,
                        'new_size' => $newSize
                    ]));

                    return ['success' => true, 'message' => __('msg_resize_started')];
                }
            }

            return ['success' => false, 'message' => __('err_queue_unavailable')];

        } catch (Exception $e) {
            Logger::error('Error en resizeCanvas.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_internal_server_error')];
        }
    }

    public function getResizeSettings(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId);
            
            if (!$canvas || !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $settings = $this->canvasRepository->getResizeSettings($canvasId);
            if (!$settings) {
                $settings = [
                    'is_active' => false,
                    'next_resize_at' => null,
                    'target_size' => '64x64'
                ];
            } else {
                $settings['is_active'] = (bool)$settings['is_active'];
            }

            return ['success' => true, 'data' => $settings];
        } catch (Exception $e) {
            Logger::error('Error getting resize settings.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

  public function updateResizeSettings(int $userId, int $canvasId, array $data): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId);

            if (!$canvas || !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $isActive = filter_var($data['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $nextResizeAt = null;

            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
            $targetSize = isset($allSizes[$data['target_size']]) ? $data['target_size'] : '64x64';
            
            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = (int)($owner['subscription_tier'] ?? 0);
                $requiredTier = (int)($allSizes[$targetSize]['tier'] ?? 0);
                
                if ($tier < $requiredTier) {
                    return ['success' => false, 'message' => __('err_plan_canvas_size')];
                }

                $currentTier = (int)($allSizes[$canvas['size']]['tier'] ?? 0);
                if ($requiredTier >= 3 && $currentTier < 3) {
                    $tier3Count = $this->canvasRepository->countUserTierCanvases($canvas['owner_id'], 3);
                    if ($tier3Count >= 3) {
                        return ['success' => false, 'message' => __('err_canvas_tier3_limit_reached')];
                    }
                }
            }
            
            if ($isActive) {
                if (empty($data['next_resize_at'])) {
                    return ['success' => false, 'message' => __('err_resize_date_required')];
                }
                
                $date = DateTime::createFromFormat('Y-m-d H:i:s', $data['next_resize_at'], new \DateTimeZone('UTC'));
                if (!$date || $date->format('Y-m-d H:i:s') !== $data['next_resize_at']) {
                    return ['success' => false, 'message' => __('err_invalid_date_format')];
                }

                $now = new DateTime('now', new \DateTimeZone('UTC'));
                if (($date->getTimestamp() - $now->getTimestamp()) < 300) {
                    return ['success' => false, 'message' => __('err_schedule_min_5_minutes')];
                }

                $nextResizeAt = $data['next_resize_at'];
            }

            $settings = [
                'is_active' => $isActive ? 1 : 0,
                'next_resize_at' => $nextResizeAt,
                'target_size' => $targetSize
            ];

            $this->canvasRepository->updateResizeSettings($canvasId, $settings);

            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    if ($redis) {
                        $redisKey = CacheConstants::PREFIX_CANVAS_NEXT_RESIZE . $canvasId;
                        if ($isActive && $nextResizeAt) {
                            $payload = json_encode([
                                'next_resize_at' => $nextResizeAt,
                                'target_size' => $targetSize
                            ]);
                            $redis->set($redisKey, $payload);
                        } else {
                            $redis->del($redisKey);
                        }

                        $redis->publish("admin:canvas_events", json_encode([
                            'type' => 'canvas_resize_settings_updated',
                            'canvas_id' => $canvasId,
                            'is_active' => $isActive,
                            'next_resize_at' => $nextResizeAt,
                            'target_size' => $targetSize
                        ]));
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error actualizando Redis para resize settings.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => __('msg_resize_settings_updated')];
        } catch (Exception $e) {
            Logger::error('Error updating resize settings.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getResetSettings(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId);
            
            if (!$canvas || !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $settings = $this->canvasRepository->getResetSettings($canvasId);
            if (!$settings) {
                $settings = [
                    'is_active' => false,
                    'next_reset_at' => null,
                    'take_snapshot' => true
                ];
            } else {
                $settings['is_active'] = (bool)$settings['is_active'];
                $settings['take_snapshot'] = (bool)$settings['take_snapshot'];
            }

            return ['success' => true, 'data' => $settings];
        } catch (Exception $e) {
            Logger::error('Error getting reset settings.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function updateResetSettings(int $userId, int $canvasId, array $data): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId);

            if (!$canvas || !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }



            $isActive = filter_var($data['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $takeSnapshot = filter_var($data['take_snapshot'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $nextResetAt = null;

            if ($isActive && $takeSnapshot && $canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                if ($planLimits['max_snapshots_per_canvas'] !== -1) {
                    $currentSnapshots = $this->canvasRepository->countCanvasSnapshots($canvasId);
                    if ($currentSnapshots >= $planLimits['max_snapshots_per_canvas']) {
                        return ['success' => false, 'message' => __('err_max_capturas_reached')];
                    }
                }
            }
            
            if ($isActive) {
                if (empty($data['next_reset_at'])) {
                    return ['success' => false, 'message' => __('err_reset_date_required')];
                }
                
                $date = DateTime::createFromFormat('Y-m-d H:i:s', $data['next_reset_at'], new \DateTimeZone('UTC'));
                if (!$date || $date->format('Y-m-d H:i:s') !== $data['next_reset_at']) {
                    return ['success' => false, 'message' => __('err_invalid_date_format')];
                }

                $now = new DateTime('now', new \DateTimeZone('UTC'));
                if (($date->getTimestamp() - $now->getTimestamp()) < 300) {
                    return ['success' => false, 'message' => __('err_schedule_min_5_minutes')];
                }

                $nextResetAt = $data['next_reset_at'];
            }

            $settings = [
                'is_active' => $isActive ? 1 : 0,
                'next_reset_at' => $nextResetAt,
                'take_snapshot' => $takeSnapshot ? 1 : 0
            ];

            $this->canvasRepository->updateResetSettings($canvasId, $settings);

            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    if ($redis) {
                        $redisKey = CacheConstants::PREFIX_CANVAS_NEXT_RESET . $canvasId;
                        if ($isActive && $nextResetAt) {
                            $redis->set($redisKey, $nextResetAt);
                        } else {
                            $redis->del($redisKey);
                        }

                        $redis->publish("admin:canvas_events", json_encode([
                            'type' => 'canvas_reset_settings_updated',
                            'canvas_id' => $canvasId,
                            'is_active' => $isActive,
                            'next_reset_at' => $nextResetAt,
                            'take_snapshot' => $takeSnapshot
                        ]));
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error actualizando Redis para reset settings.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => __('msg_reset_settings_updated')];
        } catch (Exception $e) {
            Logger::error('Error updating reset settings.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function resetCanvasNow(int $userId, int $canvasId, bool $takeSnapshot = true): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }



            $role = null;
            $isOwner = ($canvas['owner_id'] !== null && (int)$canvas['owner_id'] === (int)$userId);

            if (!$isOwner) {
                if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::MANAGE_SETTINGS)) {
                    return ['success' => false, 'message' => __('err_unauthorized')];
                }
            }

            if ($takeSnapshot) {
                $this->createSnapshot($userId, $canvasId);
            }

            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    
                    if ($redis) {
                        $redis->hset("canvases:force_resets_options", (string)$canvasId, json_encode(['take_snapshot' => $takeSnapshot ? 1 : 0]));
                        $redis->sadd("canvases:force_resets", [$canvasId]);
                        
                        $websocketMsg = [
                            'type' => 'canvas_locked',
                            'canvas_id' => $canvasId
                        ];
                        $redis->publish("admin:canvas_events", json_encode($websocketMsg));
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error insertando orden de reseteo forzado en Redis o notificando bloqueo.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => __('msg_reset_order_sent')];
            
        } catch (Exception $e) {
            Logger::error('Error in resetCanvasNow.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function createSnapshot(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $isOwner = ($canvas['owner_id'] !== null && (int)$canvas['owner_id'] === (int)$userId);
            if (!$isOwner) {
                if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, CanvasPermissionsConstants::MANAGE_SETTINGS)) {
                    return ['success' => false, 'message' => __('err_unauthorized')];
                }
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                if ($planLimits['max_snapshots_per_canvas'] !== -1) {
                    $currentSnapshots = $this->canvasRepository->countCanvasSnapshots($canvasId);
                    if ($currentSnapshots >= $planLimits['max_snapshots_per_canvas']) {
                        return ['success' => false, 'message' => __('err_max_capturas_reached')];
                    }
                }
            }

            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    
                    if ($redis) {
                        $redis->setex("canvas:{$canvasId}:snapshot_lock", 300, "1");
                        $redis->sadd("canvases:force_snapshots", [$canvasId]);
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error insertando orden de snapshot en Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => __('msg_captura_order_sent')];
            
        } catch (Exception $e) {
            Logger::error('Error in createSnapshot.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getCanvasRoles(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $roles = $this->canvasRepository->getCanvasRoles($canvasId);
            return ['success' => true, 'data' => $roles];
        } catch (Exception $e) {
            Logger::error('Error getting canvas roles.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getCanvasPermissions(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $permissions = $this->canvasRepository->getCanvasPermissions();
            return ['success' => true, 'data' => $permissions];
        } catch (Exception $e) {
            Logger::error('Error getting canvas permissions.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function createCanvasRole(int $userId, int $canvasId, string $name, array $permissions, int $weight = 10): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if (!$isOwner) {
                $requesterWeight = $this->canvasRepository->getUserCanvasWeight($userId, $canvasId);
                // query moved to repository
                // execute removed
                // fetch removed
                // assignment removed
                
                if ($weight >= $requesterWeight) {
                    return ['success' => false, 'message' => __('err_role_weight_too_high')];
                }
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = (int)($owner['subscription_tier'] ?? 0);
                if (!SubscriptionPlanConstants::hasFeature($tier, 'advanced_roles')) { 
                    return ['success' => false, 'message' => __('err_plan_custom_roles')];
                }
            }

            $roleId = $this->canvasRepository->createCanvasRole($canvasId, $name, $permissions, $weight);
            return ['success' => true, 'message' => __('msg_role_created'), 'data' => ['id' => $roleId]];
        } catch (Exception $e) {
            Logger::error('Error creating canvas role.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function updateCanvasRole(int $userId, int $roleId, int $canvasId, string $name, ?array $permissions = null, int $weight = 10): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if (!$isOwner) {
                $requesterWeight = $this->canvasRepository->getUserCanvasWeight($userId, $canvasId);
                // query moved to repository
                // execute removed
                // fetch removed
                // assignment removed
                
                if ($weight >= $requesterWeight) {
                    return ['success' => false, 'message' => __('err_role_weight_too_high')];
                }
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = (int)($owner['subscription_tier'] ?? 0);
                if (!SubscriptionPlanConstants::hasFeature($tier, 'advanced_roles')) { 
                    return ['success' => false, 'message' => __('err_plan_custom_roles')];
                }
            }

            $success = $this->canvasRepository->updateCanvasRole($roleId, $canvasId, $name, $permissions, $weight);
            if ($success) return ['success' => true, 'message' => __('msg_role_updated')];
            
            return ['success' => false, 'message' => __('err_role_update_failed')];
        } catch (Exception $e) {
            Logger::error('Error updating canvas role.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function updateCanvasRolePermissions(int $userId, int $roleId, int $canvasId, array $permissions): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = (int)($owner['subscription_tier'] ?? 0);
                if (!SubscriptionPlanConstants::hasFeature($tier, 'advanced_roles')) { 
                    return ['success' => false, 'message' => __('err_plan_custom_roles')];
                }
            }

            $role = $this->canvasRepository->pdo->prepare("SELECT id FROM canvas_roles WHERE id = ? AND canvas_id = ?");
            $role->execute([$roleId, $canvasId]);
            if (!$role->fetch()) {
                return ['success' => false, 'message' => __('err_role_not_found')];
            }

            $success = $this->canvasRepository->updateCanvasRolePermissions($roleId, $permissions);
            if ($success) return ['success' => true, 'message' => __('msg_permissions_updated')];
            
            return ['success' => false, 'message' => __('err_permissions_update_failed')];
        } catch (\Exception $e) {
            Logger::error('Error updating canvas role permissions.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deleteCanvasRole(int $userId, int $roleId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = (int)($owner['subscription_tier'] ?? 0);
                if (!SubscriptionPlanConstants::hasFeature($tier, 'advanced_roles')) { 
                    return ['success' => false, 'message' => __('err_plan_custom_roles')];
                }
            }

            $success = $this->canvasRepository->deleteCanvasRole($roleId, $canvasId);
            if ($success) return ['success' => true, 'message' => __('msg_role_deleted')];
            
            return ['success' => false, 'message' => __('err_role_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error deleting canvas role.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
