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
}
