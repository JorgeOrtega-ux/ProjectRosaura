<?php
// api/services/CanvasServices.php
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
use App\Config\RedisCache;
use App\Config\DatabaseManager;
use PDO;

class CanvasServices {
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
                return ['success' => false, 'message' => __('err_canvas_not_found'), 'http_code' => 404];
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

    public function getPublicCanvases(?int $currentUserId, int $limit = 20, string $sort = 'newest'): array {
        try {
            $canvases = $this->canvasRepository->getPublicCanvases($limit, $currentUserId, $sort);
            
            $onlineCounts = [];
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis) {
                        $onlineCounts = $redis->hGetAll("canvas:online_counts") ?: [];
                    }
                }
            } catch (Exception $e) {}
            
            $formattedCanvases = array_map(function($canvas) use ($currentUserId, $onlineCounts) {
                $canvas['is_owner'] = ($canvas['owner_id'] === $currentUserId && $canvas['owner_id'] !== null);
                
                $thumbnailPath = "public/storage/thumbnails/canvas_" . $canvas['id'] . ".png";
                $physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . $canvas['id'] . '.png';
                $thumbnailUrl = null;
                
                if (file_exists($physicalPath)) {
                    $timestamp = filemtime($physicalPath);
                    $thumbnailUrl = "/" . $thumbnailPath . "?v=" . $timestamp;
                }
                
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

    public function getOfficialCanvases(?int $currentUserId = null, string $sort = 'newest'): array {
        try {
            $canvases = $this->canvasRepository->getOfficialCanvases($currentUserId, $sort);
            
            $onlineCounts = [];
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis) {
                        $onlineCounts = $redis->hGetAll("canvas:online_counts") ?: [];
                    }
                }
            } catch (Exception $e) {}
            
            $formattedCanvases = array_map(function($canvas) use ($onlineCounts) {
                $canvas['is_owner'] = false; 
                $canvas['privacy'] = 'public'; 
                
                $thumbnailPath = "public/storage/thumbnails/canvas_" . $canvas['id'] . ".png";
                $physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . $canvas['id'] . '.png';
                $thumbnailUrl = null;
                
                if (file_exists($physicalPath)) {
                    $timestamp = filemtime($physicalPath);
                    $thumbnailUrl = "/" . $thumbnailPath . "?v=" . $timestamp;
                }
                
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

    public function getMine(?int $userId, int $limit = 50, string $filter = 'all'): array {
        if (!$userId) return ['success' => false, 'message' => __('err_unauthorized')];
        try {
            $canvases = $this->canvasRepository->getUserAndJoinedCanvases($userId, $limit, $filter);
            
            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
            
            $totalOwned = method_exists($this->canvasRepository, 'countUserCanvases') ? $this->canvasRepository->countUserCanvases($userId) : 0;
            $toLockCount = ($planLimits['max_canvases'] !== -1) ? max(0, $totalOwned - $planLimits['max_canvases']) : 0;
            
            // Format canvases similar to getPublicCanvases
            $formattedCanvases = [];
            foreach ($canvases as $canvas) {
                $isLocked = false;
                $lockedReasons = [];
                
                if ($canvas['is_owner']) {
                    if ($toLockCount > 0) {
                        $isLocked = true;
                        $lockedReasons[] = 'max_canvases';
                        $toLockCount--;
                    }
                    
                    $sizeStr = $canvas['size'];
                    $requiredTier = $allSizes[$sizeStr]['tier'] ?? 0;
                    if ($tier < $requiredTier) {
                        $isLocked = true;
                        $lockedReasons[] = 'size';
                    }
                    
                    if (isset($canvas['palette_id']) && $canvas['palette_id'] !== 'default' && empty($planLimits['custom_palettes'])) {
                        $isLocked = true;
                        $lockedReasons[] = 'palette';
                    }
                    
                    if ($planLimits['max_members_per_canvas'] !== -1 && $canvas['max_participants'] > $planLimits['max_members_per_canvas']) {
                        $isLocked = true;
                        $lockedReasons[] = 'members';
                    }
                }
                
                $thumbnailPath = "public/storage/thumbnails/canvas_" . $canvas['id'] . ".png";
                $physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . $canvas['id'] . '.png';
                $thumbnailUrl = null;
                
                if (file_exists($physicalPath)) {
                    $timestamp = filemtime($physicalPath);
                    $thumbnailUrl = "/" . $thumbnailPath . "?v=" . $timestamp;
                }
                
                $formattedCanvases[] = [
                    'id' => $canvas['id'],
                    'uuid' => $canvas['uuid'],
                    'name' => $canvas['name'],
                    'description' => $canvas['description'],
                    'privacy' => $canvas['privacy'],
                    'size' => $canvas['size'],
                    'max_participants' => $canvas['max_participants'],
                    'created_at' => $canvas['created_at'],
                    'scope_type' => $canvas['scope_type'],
                    'is_favorite' => $canvas['is_favorite'],
                    'is_owner' => $canvas['is_owner'],
                    'online_players' => 0, 
                    'members_count' => $canvas['members_count'],
                    'thumbnail_url' => $thumbnailUrl,
                    'locked_requires_downgrade' => $isLocked,
                    'locked_reasons' => $lockedReasons
                ];
            }
            
            return ['success' => true, 'data' => $formattedCanvases];
        } catch (\Exception $e) {
            Logger::error('Error getting user canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine()];
        }
    }

    public function getCanvas(?int $userId, int $canvasId, bool $canManageOfficial = false): array {
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
            
            $isOwner = ($userId !== null && $canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && empty($roles) && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }
            
            // Assign roles and check permissions
            $canvas['roles'] = $isOwner ? [['id' => 4, 'name' => 'SuperAdministrator', 'weight' => 100, 'is_system' => 1]] : $roles;
            // Provide a flat list of permissions for the frontend
            $permissions = [];
            if ($isOwner) {
                $permissions = ['place_pixels', 'manage_settings', 'manage_members', 'manage_roles', 'assign_roles', 'view_history', 'manage_resets'];
            } else {
                foreach ($roles as $r) {
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'place_pixels')) $permissions[] = 'place_pixels';
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_settings')) $permissions[] = 'manage_settings';
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_members')) $permissions[] = 'manage_members';
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) $permissions[] = 'manage_roles';
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'assign_roles')) $permissions[] = 'assign_roles';
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'view_history')) $permissions[] = 'view_history';
                    if ($this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_resets')) $permissions[] = 'manage_resets';
                }
                $permissions = array_unique($permissions);
            }
            $canvas['permissions'] = $permissions;

            // Compatibilidad hacia atrás para el frontend (DesignNetwork.js espera 'role')
            if ($isOwner) {
                $canvas['role'] = 'admin';
            } elseif (in_array('manage_settings', $permissions) || in_array('manage_roles', $permissions)) {
                $canvas['role'] = 'admin';
            } elseif (in_array('place_pixels', $permissions)) {
                $canvas['role'] = 'editor';
            } else {
                $canvas['role'] = 'spectator';
            }


            // ====================================================
            // Lógica de Bloqueo por Plan Expirado
            // ====================================================
            $ownerTier = 0;
            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $ownerTier = $owner['subscription_tier'] ?? 0;
            }
            $planLimits = SubscriptionPlanConstants::getTierLimits($ownerTier);
            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
            
            $isLocked = false;
            $lockedReasons = [];

            if ($canvas['owner_id'] !== null) {
                if ($planLimits['max_canvases'] !== -1) {
                    $olderCount = method_exists($this->canvasRepository, 'countOlderCanvases') ? 
                        $this->canvasRepository->countOlderCanvases($canvasId, $canvas['owner_id'], $canvas['created_at']) : 0;
                    if ($olderCount >= $planLimits['max_canvases']) {
                        $isLocked = true;
                        $lockedReasons[] = 'max_canvases';
                    }
                }
                
                $sizeStr = $canvas['size'];
                $requiredTier = $allSizes[$sizeStr]['tier'] ?? 0;
                if ($ownerTier < $requiredTier) {
                    $isLocked = true;
                    $lockedReasons[] = 'size';
                }
                
                if (isset($canvas['palette_id']) && $canvas['palette_id'] !== 'default' && empty($planLimits['custom_palettes'])) {
                    $isLocked = true;
                    $lockedReasons[] = 'palette';
                }
                
                if ($planLimits['max_members_per_canvas'] !== -1 && $canvas['max_participants'] > $planLimits['max_members_per_canvas']) {
                    $isLocked = true;
                    $lockedReasons[] = 'members';
                }
            }

            if ($isLocked) {
                return ['success' => false, 'message' => __('err_premium_expired_downgrade'), 'locked_requires_downgrade' => true, 'locked_reasons' => $lockedReasons];
            }

            // ====================================================
            // Lógica ajustada para tamaño Ancho x Alto
            // ====================================================
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

            // OBTENER ESTADO DE REINICIO
            $resetSettings = $this->canvasRepository->getResetSettings($canvasId);
            if ($resetSettings && $resetSettings['is_active']) {
                $canvas['next_reset_at'] = $resetSettings['next_reset_at'];
            } else {
                $canvas['next_reset_at'] = null;
            }

            // OBTENER ESTADO DE EXPANSIÓN PROGRAMADA
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

                    if ($redis && $redis->exists($redisKey)) {
                        $stateRaw = $redis->get($redisKey);
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error leyendo lienzo de Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
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
                $stateRaw = str_repeat(chr(255), $totalPixels); 
                
                if ($redis) {
                    try {
                        $redis->set($redisKey, $stateRaw);
                    } catch (Exception $e) {}
                }
            }

            $canvas['state_base64'] = base64_encode($stateRaw);

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
        ?string $description, 
        string $privacy, 
        bool $requiresApproval = false, 
        string $size = '64x64', 
        int $limit = 10, 
        string $paletteId = 'default', 
        int $cooldownBatch = 5, 
        int $cooldownSeconds = 10,
        string $scopeType = 'personal',
        ?string $scopeRef1 = null,
        ?string $scopeRef2 = null,
        ?string $scopeRef3 = null,
        bool $canManageOfficial = false,
        int $allowPurchases = 1
    ): array {
        try {
            if ($scopeType !== 'personal' && !$canManageOfficial) {
                return ['success' => false, 'message' => __('err_cannot_create_official_canvas')];
            }

            if ($scopeType !== 'personal') {
                $hash = md5($scopeType . '_' . ($scopeRef1) . '_' . ($scopeRef2) . '_' . ($scopeRef3));
                $existing = $this->canvasRepository->getByScopeHash($hash);
                if ($existing) {
                    return ['success' => false, 'message' => __('err_official_canvas_exists'), 'http_code' => 409];
                }
            }

            if ($scopeType === 'personal') {
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
                'owner_id'              => ($scopeType === 'personal') ? $userId : null,
                'name'                  => trim($name),
                'description'           => $description ? trim($description) : null,
                'privacy'               => $privacy,
                'requires_approval'     => $requiresApproval ? 1 : 0,
                'size'                  => $size,
                'palette_id'            => $paletteId,
                'max_participants'      => $limit,
                'cooldown_pixels_batch' => max(1, $cooldownBatch),
                'cooldown_seconds'      => max(0, $cooldownSeconds),
                'scope_type'            => $scopeType,
                'scope_ref_1'           => $scopeRef1,
                'scope_ref_2'           => $scopeRef2,
                'scope_ref_3'           => $scopeRef3,
                'allow_purchases'       => $allowPurchases
            ];

            $canvasId = $this->canvasRepository->create($canvasData);

            if ($scopeType === 'personal') {
                $this->canvasRepository->addMember($canvasId, $userId, 4); // 4 = SuperAdministrator
            }

            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis) {
                        $redis->hMSet("canvas:{$canvasId}:config", [
                            'cooldown_batch' => $canvasData['cooldown_pixels_batch'],
                            'cooldown_seconds' => $canvasData['cooldown_seconds']
                        ]);

                        if ($scopeType !== 'personal') {
                            $redis->del(CacheConstants::KEY_OFFICIAL_CANVASES);
                        }
                    }
                }
            } catch (Exception $e) {
                Logger::error('No se pudo guardar la config de cooldown en Redis.', ['error' => $e->getMessage()]);
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

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
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

    // ==========================================
    // EXPANSIÓN EN VIVO DEL LIENZO Y PROGRAMACIÓN
    // ==========================================
    public function resizeCanvas(int $userId, int $canvasId, string $newSize, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner) {
                if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_settings')) {
                    return ['success' => false, 'message' => __('err_unauthorized')];
                }
            }

            $oldSize = $canvas['size'];
            if ($oldSize === $newSize) {
                return ['success' => false, 'message' => __('err_canvas_already_size')];
            }

            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
            if (!isset($allSizes[$newSize])) {
                return ['success' => false, 'message' => __('err_invalid_canvas_size')];
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                $requiredTier = $allSizes[$newSize]['tier'] ?? 0;
                
                if ($tier < $requiredTier) {
                    return ['success' => false, 'message' => __('err_plan_canvas_resize')];
                }
            }

            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                
                if ($redis) {
                    $lockKey = "canvas:{$canvasId}:resize_lock";
                    $redis->setex($lockKey, 60, "1"); // Bloqueo temporal preventivo para el worker
                    
                    $task = [
                        'canvas_id' => $canvasId,
                        'old_size'  => $oldSize,
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

    public function getResizeSettings(int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            
            if (!$canvas || !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $settings = $this->canvasRepository->getResizeSettings($canvasId);
            if (!$settings) {
                $settings = [
                    'is_active' => false,
                    'next_resize_at' => null,
                    'target_size' => '64x64',
                    'timer_action' => 'restart'
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

  public function updateResizeSettings(int $userId, int $canvasId, array $data, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if (!$canvas || !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $isActive = filter_var($data['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $nextResizeAt = null;
            
            // NUEVA VALIDACIÓN: Usando el Single Source of Truth
            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
            $targetSize = isset($allSizes[$data['target_size']]) ? $data['target_size'] : '64x64';
            
            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                $requiredTier = $allSizes[$targetSize]['tier'] ?? 0;
                
                if ($tier < $requiredTier) {
                    return ['success' => false, 'message' => __('err_plan_canvas_resize')];
                }
            }
            
            if ($isActive) {
                if (empty($data['next_resize_at'])) {
                    return ['success' => false, 'message' => __('err_resize_date_required')];
                }
                
                $date = DateTime::createFromFormat('Y-m-d H:i:s', $data['next_resize_at']);
                if (!$date || $date->format('Y-m-d H:i:s') !== $data['next_resize_at']) {
                    return ['success' => false, 'message' => __('err_invalid_date_format')];
                }
                $nextResizeAt = $data['next_resize_at'];
            }

            $settings = [
                'is_active' => $isActive ? 1 : 0,
                'next_resize_at' => $nextResizeAt,
                'target_size' => $targetSize,
                'timer_action' => in_array($data['timer_action'], ['stop', 'none', 'restart']) ? $data['timer_action'] : 'restart'
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

                        // 🔥 NOTIFICACIÓN EN VIVO (WEBSOCKETS)
                        $redis->publish("admin:canvas_events", json_encode([
                            'type' => 'canvas_resize_settings_updated',
                            'canvas_id' => $canvasId,
                            'is_active' => $isActive,
                            'next_resize_at' => $nextResizeAt,
                            'target_size' => $targetSize,
                            'timer_action' => $settings['timer_action']
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
    // ==========================================
    // DEGRADACIÓN A PLAN BÁSICO
    // ==========================================
    public function downgradeCanvasToBasic(int $userId, string $uuid, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            // Obtain current limits of the owner
            $ownerTier = 0;
            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $ownerTier = $owner['subscription_tier'] ?? 0;
            }
            $planLimits = SubscriptionPlanConstants::getTierLimits($ownerTier);
            $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();

            $canvasId = $canvas['id'];

            // 1. Reducción de Miembros (Trimming)
            if ($planLimits['max_members_per_canvas'] !== -1) {
                $sql = "SELECT user_id FROM " . DB::TBL_CANVAS_MEMBERS . " 
                        WHERE canvas_id = :cid ORDER BY joined_at ASC";
                if (method_exists($this->canvasRepository, 'db')) {
                    // Si no tenemos acceso directo, podemos usar PDO del repositorio asumiendo getters o hacerlo en repo
                }
                // Como necesitamos acceso a DB, crearemos un método en el repositorio
                if (method_exists($this->canvasRepository, 'trimMembersToLimit')) {
                    $this->canvasRepository->trimMembersToLimit($canvasId, $planLimits['max_members_per_canvas']);
                }
            }
            
            // 2. Restablecer Paleta y Límites
            $updateData = [
                'name' => $canvas['name'],
                'description' => $canvas['description'],
                'privacy' => $canvas['privacy'],
                'requires_approval' => $canvas['requires_approval'],
                'palette_id' => 'default',
                'max_participants' => ($planLimits['max_members_per_canvas'] !== -1) ? $planLimits['max_members_per_canvas'] : $canvas['max_participants'],
                'cooldown_pixels_batch' => $canvas['cooldown_pixels_batch'],
                'cooldown_seconds' => $canvas['cooldown_seconds']
            ];
            
            $this->canvasRepository->updateCanvasData($canvasId, $updateData);

            // 3. Reducción de Tamaño (Cropping)
            $currentSizeStr = $canvas['size'];
            
            // ¿Es válido para el plan?
            $maxAllowedSize = '64x64'; // Default safe fallback
            $maxAllowedArea = 0;
            foreach ($allSizes as $sizeKey => $sizeConfig) {
                if ($ownerTier >= $sizeConfig['tier']) {
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
                // Resize and crop
                $this->canvasRepository->updateSize($canvasId, $maxAllowedSize);

                // Recortar la imagen en binario de BD
                $stateRaw = $this->canvasRepository->getSnapshot($canvasId);
                if ($stateRaw) {
                    $oldParts = explode('x', strtolower($currentSizeStr));
                    $oldW = (int)$oldParts[0];
                    $oldH = isset($oldParts[1]) ? (int)$oldParts[1] : $oldW;

                    $newParts = explode('x', strtolower($maxAllowedSize));
                    $newW = (int)$newParts[0];
                    $newH = isset($newParts[1]) ? (int)$newParts[1] : $newW;

                    $newTotal = $newW * $newH;
                    $newStateRaw = str_repeat(chr(255), $newTotal); // Rellenar con blanco por si acaso

                    if (strlen($stateRaw) == ($oldW * $oldH)) {
                        for ($y = 0; $y < min($oldH, $newH); $y++) {
                            for ($x = 0; $x < min($oldW, $newW); $x++) {
                                $oldIdx = ($y * $oldW) + $x;
                                $newIdx = ($y * $newW) + $x;
                                $newStateRaw[$newIdx] = $stateRaw[$oldIdx];
                            }
                        }
                    } else {
                        // Mal formato, reiniciar a blanco
                        $newStateRaw = str_repeat(chr(255), $newTotal);
                    }

                    $this->canvasRepository->saveSnapshot($canvasId, $newStateRaw);
                    
                    // Actualizar Redis
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

                // Generar nuevo thumbnail físico de la imagen
                try {
                    $physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . $canvasId . '.png';
                    if (file_exists($physicalPath)) {
                        unlink($physicalPath);
                    }
                } catch (Exception $e) {}
            }

            return ['success' => true, 'message' => __('msg_canvas_downgraded')];
        } catch (\Throwable $e) {
            Logger::error('Error downgrading canvas to basic.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    // ==========================================
    public function deleteCanvas(?int $userId, string $uuid, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $deleted = $this->canvasRepository->deleteCanvasByUuid($uuid);

            if ($deleted) {
                try {
                    $physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . $canvas['id'] . '.png';
                    if (file_exists($physicalPath)) {
                        unlink($physicalPath);
                    }
                } catch (Exception $e) {
                    Logger::error('Error eliminando la imagen física del lienzo eliminado.', ['canvas_id' => $canvas['id'], 'error' => $e->getMessage()]);
                }

                try {
                    if (class_exists(RedisCache::class)) {
                        $redisInstance = new RedisCache();
                        $redis = $redisInstance->getClient();
                        if ($redis) {
                            $redis->del("canvas:{$canvas['id']}:state");
                            $redis->del("canvas:{$canvas['id']}:config");
                            $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESET . $canvas['id']);
                            $redis->del(CacheConstants::PREFIX_CANVAS_NEXT_RESIZE . $canvas['id']); // Agregado por seguridad
                            
                            if ($canvas['owner_id'] === null) {
                                $redis->del(CacheConstants::KEY_OFFICIAL_CANVASES);
                            }
                        }
                    }
                } catch (Exception $e) {}

                return ['success' => true, 'message' => __('msg_canvas_deleted')];
            }

            return ['success' => false, 'message' => __('err_canvas_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error deleting single canvas.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
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

    public function assignMemberRoles(int $requesterId, int $canvasId, int $targetUserId, array $roles, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];
            
            $isOwner = ($canvas['owner_id'] === $requesterId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $requesterId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($canvas['owner_id'] === $targetUserId) {
                return ['success' => false, 'message' => __('err_cannot_change_owner_roles')];
            }

            $success = $this->canvasRepository->syncUserRoles($canvasId, $targetUserId, $roles);
            if ($success) return ['success' => true, 'message' => __('msg_roles_updated')];
            
            return ['success' => false, 'message' => __('err_roles_update_failed')];
        } catch (Exception $e) {
            Logger::error('Error changing member roles.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function removeMember(int $requesterId, int $canvasId, int $targetUserId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $requesterId) || ($canvas['owner_id'] === null && $canManageOfficial);
            $isAdmin = $isOwner || $this->canvasRepository->hasCanvasPermission($canvasId, $requesterId, 'manage_roles') || $this->canvasRepository->hasCanvasPermission($canvasId, $requesterId, 'manage_settings');

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

    public function deleteUserCanvases(int $userId, array $canvasIds, string $password): array {
        try {
            if (empty($canvasIds)) {
                return ['success' => false, 'message' => __('err_no_canvases_selected')];
            }

            $user = $this->userRepository->findById($userId);
            if (!$user) return ['success' => false, 'message' => __('err_unauthorized')];

            $passwordHash = $user['password_hash'] ?? $user['password'];
            if (!password_verify($password, $passwordHash)) {
                return ['success' => false, 'message' => __('err_invalid_password')];
            }

            $deleted = $this->canvasRepository->deleteCanvases($canvasIds, $userId);

            if ($deleted) {
                try {
                    foreach ($canvasIds as $id) {
                        $physicalPath = dirname(__DIR__, 3) . '/storage/public/thumbnails/canvas_' . $id . '.png';
                        if (file_exists($physicalPath)) {
                            unlink($physicalPath);
                        }
                    }
                } catch (Exception $e) {
                    Logger::error('Error eliminando imágenes de los lienzos borrados.', ['error' => $e->getMessage()]);
                }

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

    public function getResetSettings(int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            
            if (!$canvas || !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $settings = $this->canvasRepository->getResetSettings($canvasId);
            if (!$settings) {
                $settings = [
                    'is_active' => false,
                    'next_reset_at' => null,
                    'take_snapshot' => true,
                    'timer_action' => 'restart'
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

    public function updateResetSettings(int $userId, int $canvasId, array $data, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

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
                        return ['success' => false, 'message' => __('err_max_snapshots_reached')];
                    }
                }
            }
            
            if ($isActive) {
                if (empty($data['next_reset_at'])) {
                    return ['success' => false, 'message' => __('err_reset_date_required')];
                }
                
                $date = DateTime::createFromFormat('Y-m-d H:i:s', $data['next_reset_at']);
                if (!$date || $date->format('Y-m-d H:i:s') !== $data['next_reset_at']) {
                    return ['success' => false, 'message' => __('err_invalid_date_format')];
                }
                $nextResetAt = $data['next_reset_at'];
            }

            $settings = [
                'is_active' => $isActive ? 1 : 0,
                'next_reset_at' => $nextResetAt,
                'take_snapshot' => $takeSnapshot ? 1 : 0,
                'timer_action' => in_array($data['timer_action'], ['stop', 'none', 'restart']) ? $data['timer_action'] : 'restart'
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

                        // 🔥 NOTIFICACIÓN EN VIVO (WEBSOCKETS)
                        $redis->publish("admin:canvas_events", json_encode([
                            'type' => 'canvas_reset_settings_updated',
                            'canvas_id' => $canvasId,
                            'is_active' => $isActive,
                            'next_reset_at' => $nextResetAt,
                            'take_snapshot' => $takeSnapshot,
                            'timer_action' => $settings['timer_action']
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

    public function resetCanvasNow(int $userId, int $canvasId, bool $takeSnapshot = true, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $role = null;
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if (!$isOwner) {
                if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_settings')) {
                    return ['success' => false, 'message' => __('err_unauthorized')];
                }
            }

            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    
                    if ($redis) {
                        $redis->hset("canvases:force_resets_options", (string)$canvasId, json_encode(['take_snapshot' => $takeSnapshot ? 1 : 0]));
                        $redis->sadd("canvases:force_resets", [$canvasId]);
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error insertando orden de reseteo forzado en Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => __('msg_reset_order_sent')];
            
        } catch (Exception $e) {
            Logger::error('Error in resetCanvasNow.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function requestAccess(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

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
            if ($existingReq && $existingReq['status'] === 'pending') {
                return ['success' => false, 'message' => __('err_request_pending')];
            }

            $this->canvasRepository->createAccessRequest($canvasId, $userId);
            return ['success' => true, 'joined' => false, 'message' => __('msg_request_sent')];

        } catch (Exception $e) {
            Logger::error('Error requesting access.', ['user_id' => $userId, 'canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function approveRequest(int $ownerId, int $requestId, bool $canManageOfficial = false): array {
        try {
            $request = $this->canvasRepository->getRequestById($requestId);
            if (!$request) return ['success' => false, 'message' => __('err_request_not_found')];

            $canvas = $this->canvasRepository->getById($request['canvas_id']);
            $isOwner = ($canvas['owner_id'] === $ownerId) || ($canvas['owner_id'] === null && $canManageOfficial);
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

    public function rejectRequest(int $ownerId, int $requestId, bool $canManageOfficial = false): array {
        try {
            $request = $this->canvasRepository->getRequestById($requestId);
            if (!$request) return ['success' => false, 'message' => __('err_request_not_found')];

            $canvas = $this->canvasRepository->getById($request['canvas_id']);
            $isOwner = ($canvas['owner_id'] === $ownerId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$canvas || !$isOwner) return ['success' => false, 'message' => __('err_unauthorized')];

            $this->canvasRepository->updateRequestStatus($requestId, 'rejected');

            return ['success' => true, 'message' => __('msg_access_rejected')];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getPendingRequests(int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$canvas || !$isOwner) return ['success' => false, 'message' => __('err_unauthorized')];

            $requests = $this->canvasRepository->getPendingRequests($canvasId);
            return ['success' => true, 'data' => $requests];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function prepareTimelapseDownload(?int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($canvasId, $userId);
                $hasRole = !empty($roles);
            }
            
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 403];
            }

            $baseDir = dirname(__DIR__, 3) . '/storage/private/canvases/timelapses';
            $filePath = $baseDir . '/canvas_' . $canvasId . '.jsonl';

            if (!file_exists($filePath) || filesize($filePath) === 0) {
                return ['success' => false, 'message' => __('err_no_timelapse_data'), 'http_code' => 404];
            }

            return ['success' => true, 'file_path' => $filePath];

        } catch (Exception $e) {
            Logger::error('Error preparing timelapse download.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getSnapshotDetail(string $snapshotId, ?int $userId = null, bool $canManageOfficial = false): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.file_path, s.timelapse_file_path, s.snapshot_uuid, c.id as canvas_id, c.size, c.privacy, c.owner_id, c.palette_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :snapshot_id 
                LIMIT 1
            ");
            $stmt->execute([':snapshot_id' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return ['success' => false, 'message' => __('err_snapshot_not_found')];
            }

            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($data['canvas_id'], $userId);
                $hasRole = !empty($roles);
            }

            $isOwner = ($data['owner_id'] === $userId) || ($data['owner_id'] === null && $canManageOfficial);

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $imageUrl = $data['file_path'];
            if (!str_starts_with($imageUrl, '/')) {
                $imageUrl = '/' . $imageUrl;
            }

            $hasTimelapse = !empty($data['timelapse_file_path']);

            // ====================================================
            // Lógica ajustada para tamaño Ancho x Alto
            // ====================================================
            $sizeStr = strtolower($data['size']);
            if (strpos($sizeStr, 'x') !== false) {
                $parts = explode('x', $sizeStr);
                $width = (int)$parts[0];
                $height = isset($parts[1]) ? (int)$parts[1] : $width;
            } else {
                $width = (int)$sizeStr;
                $height = $width;
            }

            return [
                'success' => true,
                'data' => [
                    'image_url' => $imageUrl,
                    'width' => $width,
                    'height' => $height,
                    'has_timelapse' => $hasTimelapse,
                    'palette_id' => $data['palette_id']
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error getting snapshot detail.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function prepareSnapshotTimelapseDownload(?int $userId, string $snapshotId, bool $canManageOfficial = false): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.timelapse_file_path, c.id as canvas_id, c.privacy, c.owner_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :snapshot_id 
                LIMIT 1
            ");
            $stmt->execute([':snapshot_id' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return ['success' => false, 'message' => __('err_snapshot_not_found'), 'http_code' => 404];
            }

            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($data['canvas_id'], $userId);
                $hasRole = !empty($roles);
            }

            $isOwner = ($data['owner_id'] === $userId) || ($data['owner_id'] === null && $canManageOfficial);

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized_view_timelapse'), 'http_code' => 403];
            }

            if (empty($data['timelapse_file_path'])) {
                return ['success' => false, 'message' => __('err_no_timelapse_file'), 'http_code' => 404];
            }

            $baseDir = dirname(__DIR__, 3) . '/storage/';
            $filePath = $baseDir . ltrim($data['timelapse_file_path'], '/');

            if (!file_exists($filePath) || filesize($filePath) === 0) {
                return ['success' => false, 'message' => __('err_physical_file_missing'), 'http_code' => 404];
            }

            return ['success' => true, 'file_path' => $filePath];

        } catch (Exception $e) {
            Logger::error('Error preparing snapshot timelapse.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_internal_server_error'), 'http_code' => 500];
        }
    }


    public function getSnapshotsGallery(string $uuid, ?int $userId = null, bool $canManageOfficial = false): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);
            $stmt = $pdo->prepare("SELECT id, owner_id, name, privacy FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1");
            $stmt->execute([':uuid' => $uuid]);
            $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($canvas['id'], $userId);
                $hasRole = !empty($roles);
            }

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $history = $this->canvasRepository->getSnapshotsHistoryByUuid($uuid);

            $formattedHistory = array_map(function($item) {
                $imageUrl = $item['file_path'];
                if (!str_starts_with($imageUrl, '/')) {
                    $imageUrl = '/' . $imageUrl;
                }
                return [
                    'id' => $item['id'],
                    'url' => $imageUrl,
                    'date' => date('d/m/Y H:i', strtotime($item['created_at'])),
                    'snapshot_uuid' => $item['snapshot_uuid']
                ];
            }, $history);

            return [
                'success' => true, 
                'data' => [
                    'canvas_name' => $canvas['name'],
                    'snapshots' => $formattedHistory
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error getting snapshots gallery.', ['uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function uploadTemplate(int $userId, array $fileInfo): array {
        try {
            if (!isset($fileInfo['error']) || is_array($fileInfo['error']) || $fileInfo['error'] !== UPLOAD_ERR_OK) {
                return ['success' => false, 'message' => __('err_file_upload')];
            }
            
            $maxSize = 5 * 1024 * 1024;
            if ($fileInfo['size'] > $maxSize) {
                return ['success' => false, 'message' => __('err_file_too_large')];
            }

            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $ext = $finfo->file($fileInfo['tmp_name']);
            $allowedTypes = [
                'jpg' => 'image/jpeg',
                'png' => 'image/png',
                'webp' => 'image/webp'
            ];
            
            $extension = array_search($ext, $allowedTypes, true);
            if ($extension === false) {
                return ['success' => false, 'message' => __('err_invalid_image_format')];
            }

            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
            
            if ($planLimits['max_storage_mb'] !== -1) {
                $currentStorageMB = $this->canvasRepository->getUserStorageUsed($userId);
                $newFileMB = $fileInfo['size'] / (1024 * 1024);
                
                if (($currentStorageMB + $newFileMB) > $planLimits['max_storage_mb']) {
                    return ['success' => false, 'message' => __('err_storage_limit_exceeded')];
                }
            }

            $uploadDir = dirname(__DIR__, 3) . '/storage/public/templates/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $fileName = sprintf('%s_%s.%s', $userId, Utils::generateUUID(), $extension);
            $destination = $uploadDir . $fileName;

            if (!move_uploaded_file($fileInfo['tmp_name'], $destination)) {
                Logger::error('Fallo al mover el archivo de plantilla al File System.', ['user_id' => $userId]);
                return ['success' => false, 'message' => __('err_file_write')];
            }

            $dbPath = 'public/storage/templates/' . $fileName;
            
            $templateId = $this->canvasRepository->saveTemplateMetadata($userId, $dbPath);

            return [
                'success' => true,
                'message' => __('msg_template_uploaded'),
                'data' => [
                    'id' => $templateId,
                    'url' => "/" . $dbPath
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error uploadTemplate.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getUserTemplates(int $userId): array {
        try {
            $templates = $this->canvasRepository->getUserTemplates($userId);
            return ['success' => true, 'data' => $templates];
        } catch (Exception $e) {
            Logger::error('Error getUserTemplates.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deleteTemplate(int $userId, int $templateId): array {
        try {
            $templates = $this->canvasRepository->getUserTemplates($userId);
            $filePath = null;
            
            foreach($templates as $t) {
                if ((int)$t['id'] === $templateId) {
                    $filePath = $t['file_path'];
                    break;
                }
            }

            $deleted = $this->canvasRepository->deleteTemplate($templateId, $userId);
            
            if ($deleted) {
                if ($filePath) {
                    $physicalPath = dirname(__DIR__, 3) . '/' . str_replace('public/storage/', 'storage/public/', ltrim($filePath, '/'));
                    if (file_exists($physicalPath)) {
                        unlink($physicalPath); 
                    }
                }
                return ['success' => true, 'message' => __('msg_template_deleted')];
            }
            return ['success' => false, 'message' => __('err_template_delete_failed')];
        } catch (Exception $e) {
            Logger::error('Error deleteTemplate.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function createLiveShare(int $userId, int $canvasId, string $imgUrl, float $x, float $y, float $w, float $h, float $opacity, bool $canManageOfficial = false): array {
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
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if (!$isOwner) {
                $hasPermission = $this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'place_pixels');
                if (!$hasPermission && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_settings')) {
                    return ['success' => false, 'message' => __('err_unauthorized')];
                }
            }

            $code = 'SHR-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));

            $data = [
                'owner_id' => $userId,
                'canvas_id' => $canvasId,
                'img_url' => $imgUrl,
                'x' => $x,
                'y' => $y,
                'w' => $w,
                'h' => $h,
                'opacity' => $opacity,
                'created_at' => time()
            ];

            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                if ($redis) {
                    $key = CacheConstants::PREFIX_LIVE_SHARE . $code;
                    $redis->set($key, json_encode($data));
                    $redis->expire($key, 14400); 

                    // Track the user's active broadcast
                    $userBroadcastKey = CacheConstants::PREFIX_LIVE_SHARE . 'user_' . $userId;
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
                            // Check if the broadcast actually still exists
                            $activeData = $redis->get(CacheConstants::PREFIX_LIVE_SHARE . $activeCode);
                            if ($activeData) {
                                return ['success' => false, 'message' => __('err_cannot_join_while_streaming')];
                            } else {
                                $redis->del($userBroadcastKey); // Cleanup stale key
                            }
                        }
                    }

                    $key = CacheConstants::PREFIX_LIVE_SHARE . $code;
                    $dataRaw = $redis->get($key);
                    
                    if ($dataRaw) {
                        $data = json_decode($dataRaw, true);
                        
                        // CORRECCIÓN: Validar que la transmisión pertenezca al lienzo actual
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

    public function toggleFavorite(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $result = $this->canvasRepository->toggleFavorite($userId, $canvasId);

            return [
                'success' => true, 
                'message' => __('msg_favorites_updated'),
                'data' => [
                    'action' => $result['action'],
                    'favorites_count' => $result['favorites_count']
                ]
            ];
            
        } catch (Exception $e) {
            Logger::error('Error toggling favorite.', [
                'user_id' => $userId, 
                'canvas_id' => $canvasId, 
                'error' => $e->getMessage()
            ]);
            
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    // ==========================================
    // NUEVOS MÉTODOS PARA INVITACIONES
    // ==========================================
    public function generateInvite(int $userId, int $canvasId, string $role, ?int $maxUses, ?string $expiresAt, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized_invites')];
            }

            $roles = $this->canvasRepository->getCanvasRoles($canvasId);
            $roleData = null;
            foreach ($roles as $r) {
                if ((string)$r['id'] === (string)$role || strtolower($r['name']) === strtolower($role)) {
                    $roleData = $r;
                    $role = (string)$r['id']; // normalizar a ID
                    break;
                }
            }

            if (!$roleData) {
                return ['success' => false, 'message' => __('err_invalid_role')];
            }

            $nameLower = strtolower(trim($roleData['name']));
            if (in_array($nameLower, ['owner', 'propietario', 'superadmin', 'superadministrador']) || (isset($roleData['weight']) && (int)$roleData['weight'] >= 100)) {
                return ['success' => false, 'message' => __('err_cannot_invite_high_privilege')];
            }

            if ($expiresAt) {
                $date = DateTime::createFromFormat('Y-m-d H:i:s', $expiresAt);
                if (!$date || $date->format('Y-m-d H:i:s') !== $expiresAt || $date->getTimestamp() <= time()) {
                    return ['success' => false, 'message' => __('err_invalid_expiration_date')];
                }
            }

            // Generar un código único
            $code = strtoupper(substr(Utils::generateUUID(), 0, 4) . '-' . substr(Utils::generateUUID(), 4, 4));

            $inviteId = $this->canvasRepository->createInvite($canvasId, $code, $role, $maxUses, $expiresAt, $userId);

            return ['success' => true, 'message' => __('msg_invite_generated'), 'data' => ['code' => $code]];
        } catch (Exception $e) {
            Logger::error('Error generating invite.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_invite_generation_failed')];
        }
    }

    public function listInvites(int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
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

    public function revokeInvite(int $userId, int $canvasId, int $inviteId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
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

            // Validar expiración
            if ($invite['expires_at'] && strtotime($invite['expires_at']) <= time()) {
                return ['success' => false, 'message' => __('err_invite_expired')];
            }

            // Validar límite de usos
            if ($invite['max_uses'] !== null && $invite['uses_count'] >= $invite['max_uses']) {
                return ['success' => false, 'message' => __('err_invite_limit_reached')];
            }

            $canvasId = $invite['canvas_id'];
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_deleted')];

            // Verificar si el usuario ya es miembro
            $memberRoles = $this->canvasRepository->getMemberRoles($canvasId, $userId);
            if (!empty($memberRoles) || $canvas['owner_id'] === $userId) {
                return ['success' => true, 'message' => __('msg_already_member'), 'data' => ['uuid' => $canvas['uuid']]];
            }

            // Validar límite de miembros del plan
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

            // Agregar al usuario y sumar uso a la invitación
            $added = $this->canvasRepository->addMember($canvasId, $userId, (int)$invite['role']);
            if ($added) {
                $this->canvasRepository->incrementInviteUses($invite['id']);
                return ['success' => true, 'message' => __('msg_joined_canvas'), 'data' => ['uuid' => $canvas['uuid']]];
            }

            return ['success' => false, 'message' => __('err_join_canvas_failed')];
        } catch (Exception $e) {
            Logger::error('Error joining via invite.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_processing_invite')];
        }
    }

    // ==========================================
    // CUSTOM PALETTES
    // ==========================================
    public function getCustomPalettes(int $userId): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_IDENTITY);

            $stmt = $pdo->prepare("SELECT id, palette_key, name, colors FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            
            $palettes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($palettes as &$p) {
                $p['colors'] = json_decode($p['colors'], true);
            }

            return ['success' => true, 'data' => $palettes];
        } catch (Exception $e) {
            Logger::error('Error getCustomPalettes.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_get_palettes_failed')];
        }
    }

    public function createCustomPalette(int $userId, string $name, array $colors): array {
        try {
            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            if (!SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')) {
                return ['success' => false, 'message' => __('err_plan_custom_palettes')];
            }

            $validColors = [];
            foreach ($colors as $c) {
                if (preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $c)) {
                    $validColors[] = strtoupper($c);
                }
            }
            if (count($validColors) < 4) {
                return ['success' => false, 'message' => __('err_palette_min_colors')];
            }
            $validColors = array_slice($validColors, 0, 36);

            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_IDENTITY);

            $stmt = $pdo->prepare("SELECT COUNT(*) FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            $count = (int)$stmt->fetchColumn();

            if ($count >= 5) {
                return ['success' => false, 'message' => __('err_max_custom_palettes')];
            }

            $paletteKey = 'custom_' . $userId . '_' . Utils::generateUUID();

            $stmt = $pdo->prepare("INSERT INTO custom_palettes (user_id, palette_key, name, colors) VALUES (:user_id, :palette_key, :name, :colors)");
            $stmt->execute([
                ':user_id' => $userId,
                ':palette_key' => $paletteKey,
                ':name' => $name,
                ':colors' => json_encode($validColors)
            ]);

            return ['success' => true, 'message' => __('msg_palette_created'), 'data' => ['palette_key' => $paletteKey]];
        } catch (Exception $e) {
            Logger::error('Error createCustomPalette.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_palette_create_failed')];
        }
    }

    public function deleteCustomPalette(int $userId, string $paletteKey): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_IDENTITY);

            $stmt = $pdo->prepare("DELETE FROM custom_palettes WHERE user_id = :user_id AND palette_key = :palette_key");
            $stmt->execute([
                ':user_id' => $userId,
                ':palette_key' => $paletteKey
            ]);

            if ($stmt->rowCount() > 0) {
                return ['success' => true, 'message' => __('msg_palette_deleted')];
            }
            return ['success' => false, 'message' => __('err_palette_not_found')];
        } catch (Exception $e) {
            Logger::error('Error deleteCustomPalette.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_palette_delete_failed')];
        }
    }

    public function getCanvasRoles(int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
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

    public function getCanvasPermissions(int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
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

    public function createCanvasRole(int $userId, int $canvasId, string $name, array $permissions, int $weight = 10, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if (!$isOwner) {
                $requesterWeight = 0;
                $stmtRole = $this->canvasRepository->pdo->prepare("SELECT r.weight FROM canvas_roles r JOIN canvas_user_roles ur ON r.id = ur.role_id WHERE ur.canvas_id = :cid AND ur.user_id = :uid ORDER BY r.weight DESC LIMIT 1");
                $stmtRole->execute(['cid' => $canvasId, 'uid' => $userId]);
                $w = $stmtRole->fetchColumn();
                if ($w !== false) $requesterWeight = (int)$w;
                
                if ($weight >= $requesterWeight) {
                    return ['success' => false, 'message' => __('err_role_weight_too_high')];
                }
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                if ($tier < 2) { 
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

    public function updateCanvasRole(int $userId, int $roleId, int $canvasId, string $name, ?array $permissions = null, int $weight = 10, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if (!$isOwner) {
                $requesterWeight = 0;
                $stmtRole = $this->canvasRepository->pdo->prepare("SELECT r.weight FROM canvas_roles r JOIN canvas_user_roles ur ON r.id = ur.role_id WHERE ur.canvas_id = :cid AND ur.user_id = :uid ORDER BY r.weight DESC LIMIT 1");
                $stmtRole->execute(['cid' => $canvasId, 'uid' => $userId]);
                $w = $stmtRole->fetchColumn();
                if ($w !== false) $requesterWeight = (int)$w;
                
                if ($weight >= $requesterWeight) {
                    return ['success' => false, 'message' => __('err_role_weight_too_high')];
                }
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                if ($tier < 2) { 
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

    public function updateCanvasRolePermissions(int $userId, int $roleId, int $canvasId, array $permissions, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                if ($tier < 2) { 
                    return ['success' => false, 'message' => __('err_plan_custom_roles')];
                }
            }
            
            // Re-fetch the role to verify ownership and avoid changing name/weight
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

    public function deleteCanvasRole(int $userId, int $roleId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found')];

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner && !$this->canvasRepository->hasCanvasPermission($canvasId, $userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                if ($tier < 2) { 
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
?>
