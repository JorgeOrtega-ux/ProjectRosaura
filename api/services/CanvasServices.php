<?php
// api/services/CanvasServices.php
namespace App\Api\Services;

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
        $path = dirname(__DIR__, 2) . '/public/assets/data/palettes.json';
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
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.', 'http_code' => 404];
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
            
            return ['success' => false, 'message' => 'El servicio de WebSockets no está disponible actualmente.', 'http_code' => 503];

        } catch (Exception $e) {
            Logger::error('Error generating WS ticket.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Error interno del servidor.', 'http_code' => 500];
        }
    }

    public function getPublicCanvases(?int $currentUserId, int $limit = 20): array {
        try {
            $canvases = $this->canvasRepository->getPublicCanvases($limit, $currentUserId);
            
            $formattedCanvases = array_map(function($canvas) use ($currentUserId) {
                $canvas['is_owner'] = ($canvas['owner_id'] === $currentUserId && $canvas['owner_id'] !== null);
                
                $snapshotPath = "public/storage/snapshots/canvas_" . $canvas['id'] . ".png";
                $physicalPath = dirname(__DIR__, 2) . '/storage/public/snapshots/canvas_' . $canvas['id'] . '.png';
                $snapshotUrl = null;
                
                if (file_exists($physicalPath)) {
                    $timestamp = filemtime($physicalPath);
                    $snapshotUrl = "/" . $snapshotPath . "?v=" . $timestamp;
                }
                
                $canvas['snapshot_url'] = $snapshotUrl;
                return $canvas;
            }, $canvases);
            
            return ['success' => true, 'data' => $formattedCanvases];
        } catch (Exception $e) {
            Logger::error('Error getting public canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error al cargar los lienzos públicos.'];
        }
    }

    public function getOfficialCanvases(?int $currentUserId = null): array {
        try {
            $canvases = $this->canvasRepository->getOfficialCanvases($currentUserId);
            
            $formattedCanvases = array_map(function($canvas) {
                $canvas['is_owner'] = false; 
                $canvas['privacy'] = 'public'; 
                
                $snapshotPath = "public/storage/snapshots/canvas_" . $canvas['id'] . ".png";
                $physicalPath = dirname(__DIR__, 2) . '/storage/public/snapshots/canvas_' . $canvas['id'] . '.png';
                $snapshotUrl = null;
                
                if (file_exists($physicalPath)) {
                    $timestamp = filemtime($physicalPath);
                    $snapshotUrl = "/" . $snapshotPath . "?v=" . $timestamp;
                }
                
                $canvas['snapshot_url'] = $snapshotUrl;
                return $canvas;
            }, $canvases);
            
            return ['success' => true, 'data' => $formattedCanvases];
        } catch (Exception $e) {
            Logger::error('Error getting official canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error al cargar los lienzos oficiales.'];
        }
    }

    public function getCanvas(?int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }
            
            $role = null;
            
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($canvasId, $userId);
                
                if (method_exists($this->canvasRepository, 'isFavorite')) {
                    $canvas['is_favorite'] = $this->canvasRepository->isFavorite($userId, $canvasId);
                } else {
                    $canvas['is_favorite'] = false;
                }
            } else {
                $canvas['is_favorite'] = false;
            }
            
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$role && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para ver este lienzo.'];
            }
            
            if ($isOwner) {
                $canvas['role'] = 'admin'; 
            } else {
                $canvas['role'] = $role ?: 'spectator'; 
            }

            $canvas['max_members'] = $canvas['max_participants'];
            $canvas['width'] = $canvas['size'];
            $canvas['height'] = $canvas['size'];
            $canvas['requires_approval'] = (bool)$canvas['requires_approval'];

            $resetSettings = $this->canvasRepository->getResetSettings($canvasId);
            if ($resetSettings && $resetSettings['is_active']) {
                $canvas['next_reset_at'] = $resetSettings['next_reset_at'];
            } else {
                $canvas['next_reset_at'] = null;
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
                $size = (int)$canvas['size'];
                $totalPixels = $size * $size;
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
        string $size = '64', 
        int $limit = 10, 
        string $paletteId = 'default', 
        int $cooldownBatch = 5, 
        int $cooldownSeconds = 10,
        string $scopeType = 'personal',
        ?string $scopeRef1 = null,
        ?string $scopeRef2 = null,
        ?string $scopeRef3 = null,
        bool $canManageOfficial = false
    ): array {
        try {
            if ($scopeType !== 'personal' && !$canManageOfficial) {
                return ['success' => false, 'message' => 'No tienes permisos para crear lienzos oficiales.'];
            }

            if ($scopeType !== 'personal') {
                $hash = md5($scopeType . '_' . ($scopeRef1 ?? '') . '_' . ($scopeRef2 ?? '') . '_' . ($scopeRef3 ?? ''));
                $existing = $this->canvasRepository->getByScopeHash($hash);
                if ($existing) {
                    return ['success' => false, 'message' => 'Ya existe un lienzo oficial para esta ubicación u organización.', 'http_code' => 409];
                }
            }

            if ($scopeType === 'personal') {
                $user = $this->userRepository->findById($userId);
                $tier = $user['subscription_tier'] ?? 0;
                $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                if (method_exists($this->canvasRepository, 'countUserCanvases')) {
                    $currentCanvasCount = $this->canvasRepository->countUserCanvases($userId);
                    if ($planLimits['max_canvases'] !== -1 && $currentCanvasCount >= $planLimits['max_canvases']) {
                        return ['success' => false, 'message' => 'Has alcanzado el límite de lienzos de tu plan actual (' . $planLimits['name'] . '). Mejora tu plan para crear más.'];
                    }
                }

                if ($planLimits['max_members_per_canvas'] !== -1 && $limit > $planLimits['max_members_per_canvas']) {
                    $limit = $planLimits['max_members_per_canvas']; 
                }

                if ($paletteId !== 'default' && !SubscriptionPlanConstants::hasFeature($tier, 'custom_palettes')) {
                    $paletteId = 'default';
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
                'scope_ref_3'           => $scopeRef3
            ];

            $canvasId = $this->canvasRepository->create($canvasData);

            if ($scopeType === 'personal') {
                $this->canvasRepository->addMember($canvasId, $userId, 'admin');
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
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para editar este lienzo.'];
            }

            if (empty(trim($data['name']))) {
                return ['success' => false, 'message' => __('err_canvas_name_required') ?? 'El nombre es obligatorio.'];
            }
            
            $validPrivacies = [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE];
            if (!in_array($data['privacy'], $validPrivacies)) {
                $data['privacy'] = DB::PRIVACY_PRIVATE;
            }

            $validPalettes = $this->getValidPalettes();
            if (!isset($data['palette_id']) || !in_array($data['palette_id'], $validPalettes)) {
                $data['palette_id'] = $canvas['palette_id'] ?? 'default';
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

                return ['success' => true, 'message' => __('canvas_update_success') ?? 'Lienzo actualizado correctamente.'];
            }

            return ['success' => false, 'message' => __('err_canvas_update_failed') ?? 'No se pudo actualizar el lienzo.'];
        } catch (Exception $e) {
             Logger::error('Error updating canvas.', [
                 'user_id' => $userId,
                 'canvas_id' => $canvasId,
                 'exception' => $e->getMessage()
             ]);
             return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deleteSingleCanvas(int $userId, string $uuid, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }
            
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'Solo el dueño (o un administrador en lienzos oficiales) puede eliminar este lienzo.'];
            }

            $deleted = $this->canvasRepository->deleteCanvasByUuid($uuid);

            if ($deleted) {
                try {
                    $physicalPath = dirname(__DIR__, 2) . '/storage/public/snapshots/canvas_' . $canvas['id'] . '.png';
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
                            
                            if ($canvas['owner_id'] === null) {
                                $redis->del(CacheConstants::KEY_OFFICIAL_CANVASES);
                            }
                        }
                    }
                } catch (Exception $e) {}

                return ['success' => true, 'message' => 'Lienzo eliminado exitosamente.'];
            }

            return ['success' => false, 'message' => 'Error al eliminar el lienzo.'];
        } catch (Exception $e) {
            Logger::error('Error deleting single canvas.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function leaveCanvas(int $userId, string $uuid): array {
        try {
            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }
            
            if ($canvas['owner_id'] === $userId) {
                return ['success' => false, 'message' => 'Como dueño, no puedes salir del lienzo personal. Debes eliminarlo.'];
            }

            $role = $this->canvasRepository->getMemberRole($canvas['id'], $userId);
            if (!$role) {
                return ['success' => false, 'message' => 'No eres miembro de este lienzo.'];
            }

            $removed = $this->canvasRepository->removeMember($canvas['id'], $userId);
            if ($removed) {
                return ['success' => true, 'message' => 'Has abandonado el lienzo exitosamente.'];
            }

            return ['success' => false, 'message' => 'Error al salir del lienzo.'];
        } catch (Exception $e) {
            Logger::error('Error leaving canvas.', ['user_id' => $userId, 'uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function changeMemberRole(int $requesterId, int $canvasId, int $targetUserId, string $newRole, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            $requesterRole = $this->canvasRepository->getMemberRole($canvasId, $requesterId);
            $isOwner = ($canvas['owner_id'] === $requesterId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if ($isOwner) $requesterRole = 'admin';

            if ($requesterRole !== 'admin') {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos de administrador en este lienzo.'];
            }

            if ($canvas['owner_id'] === $targetUserId) {
                return ['success' => false, 'message' => 'No puedes cambiar el rol del creador original del lienzo.'];
            }

            $validRoles = ['viewer', 'editor', 'admin'];
            if (!in_array($newRole, $validRoles)) {
                return ['success' => false, 'message' => 'Rol inválido.'];
            }

            if ($newRole !== 'viewer' && $canvas['owner_id'] !== null) {
                $owner = $this->userRepository->findById($canvas['owner_id']);
                $tier = $owner['subscription_tier'] ?? 0;
                if (!SubscriptionPlanConstants::hasFeature($tier, 'advanced_roles')) {
                    return ['success' => false, 'message' => 'El plan actual del dueño del lienzo no permite asignar roles avanzados.'];
                }
            }

            $updated = $this->canvasRepository->updateMemberRole($canvasId, $targetUserId, $newRole);
            if ($updated) return ['success' => true, 'message' => 'Rol actualizado correctamente.'];
            
            return ['success' => false, 'message' => 'No se pudo actualizar el rol.'];
        } catch (Exception $e) {
            Logger::error('Error changing member role.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }

    public function removeMember(int $requesterId, int $canvasId, int $targetUserId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            $requesterRole = $this->canvasRepository->getMemberRole($canvasId, $requesterId);
            $isOwner = ($canvas['owner_id'] === $requesterId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if ($isOwner) $requesterRole = 'admin';

            if ($requesterRole !== 'admin') {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos de administrador en este lienzo.'];
            }

            if ($canvas['owner_id'] === $targetUserId) {
                return ['success' => false, 'message' => 'No puedes expulsar al creador original del lienzo.'];
            }

            $removed = $this->canvasRepository->removeMember($canvasId, $targetUserId);
            if ($removed) return ['success' => true, 'message' => 'Miembro expulsado correctamente.'];
            
            return ['success' => false, 'message' => 'No se pudo expulsar al miembro o ya no pertenece al lienzo.'];
        } catch (Exception $e) {
            Logger::error('Error removing member.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }

    public function deleteUserCanvases(int $userId, array $canvasIds, string $password): array {
        try {
            if (empty($canvasIds)) {
                return ['success' => false, 'message' => __('err_no_canvases_selected') ?? 'No se ha seleccionado ningún lienzo.'];
            }

            $user = $this->userRepository->findById($userId);
            if (!$user) return ['success' => false, 'message' => __('err_unauthorized')];

            $passwordHash = $user['password_hash'] ?? $user['password'] ?? '';
            if (!password_verify($password, $passwordHash)) {
                return ['success' => false, 'message' => __('err_invalid_password') ?? 'Contraseña incorrecta.'];
            }

            $deleted = $this->canvasRepository->deleteCanvases($canvasIds, $userId);

            if ($deleted) {
                try {
                    foreach ($canvasIds as $id) {
                        $physicalPath = dirname(__DIR__, 2) . '/storage/public/snapshots/canvas_' . $id . '.png';
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
                            }
                        }
                    }
                } catch (Exception $e) {}

                return ['success' => true, 'message' => __('msg_canvases_deleted') ?? 'Lienzos eliminados correctamente.'];
            }

            return ['success' => false, 'message' => __('err_canvases_delete_failed') ?? 'Error al eliminar los lienzos.'];
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
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para ver la configuración de este lienzo.'];
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
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para modificar este lienzo.'];
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
                        return ['success' => false, 'message' => 'Este lienzo ha alcanzado el límite máximo de snapshots permitidos por tu plan. Desactiva la captura de snapshots o actualiza tu suscripción.'];
                    }
                }
            }
            
            if ($isActive) {
                if (empty($data['next_reset_at'])) {
                    return ['success' => false, 'message' => 'La fecha de reinicio es obligatoria si la opción está activada.'];
                }
                
                $date = DateTime::createFromFormat('Y-m-d H:i:s', $data['next_reset_at']);
                if (!$date || $date->format('Y-m-d H:i:s') !== $data['next_reset_at']) {
                    return ['success' => false, 'message' => 'Formato de fecha inválido (Debe ser UTC Y-m-d H:i:s).'];
                }
                $nextResetAt = $data['next_reset_at'];
            }

            $settings = [
                'is_active' => $isActive ? 1 : 0,
                'next_reset_at' => $nextResetAt,
                'take_snapshot' => $takeSnapshot ? 1 : 0,
                'timer_action' => in_array($data['timer_action'] ?? 'restart', ['stop', 'none', 'restart']) ? $data['timer_action'] : 'restart'
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
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error actualizando Redis para reset settings.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => 'Configuración de reinicio actualizada correctamente.'];
        } catch (Exception $e) {
            Logger::error('Error updating reset settings.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function resetCanvasNow(int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }

            $role = null;
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if (!$isOwner) {
                $role = $this->canvasRepository->getMemberRole($canvasId, $userId);
                if ($role !== 'admin') {
                    return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para reiniciar este lienzo.'];
                }
            }

            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    
                    if ($redis) {
                        $redis->sadd("canvases:force_resets", [$canvasId]);
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error insertando orden de reseteo forzado en Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            return ['success' => true, 'message' => 'Orden de reinicio enviada. El lienzo se congelará para guardar el progreso y luego se limpiará automáticamente.'];
            
        } catch (Exception $e) {
            Logger::error('Error in resetCanvasNow.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno al procesar la orden de reinicio.'];
        }
    }

    public function requestAccess(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            $memberRole = $this->canvasRepository->getMemberRole($canvasId, $userId);
            if ($memberRole === 'editor' || $memberRole === 'admin') {
                return ['success' => true, 'message' => __('msg_already_member') ?? 'Ya eres miembro de este lienzo.'];
            }

            if (!$canvas['requires_approval']) {
                if ($canvas['owner_id'] !== null) {
                    $owner = $this->userRepository->findById($canvas['owner_id']);
                    $tier = $owner['subscription_tier'] ?? 0;
                    $planLimits = SubscriptionPlanConstants::getTierLimits($tier);

                    if ($planLimits['max_members_per_canvas'] !== -1) {
                        $currentMembers = $this->canvasRepository->countCanvasMembers($canvasId);
                        if ($currentMembers >= $planLimits['max_members_per_canvas']) {
                            return ['success' => false, 'message' => 'Este lienzo ha alcanzado el límite máximo de participantes permitidos.'];
                        }
                    }
                }

                $this->canvasRepository->addMember($canvasId, $userId, 'editor');
                return ['success' => true, 'message' => __('msg_joined_success') ?? 'Te has unido al lienzo.'];
            }

            $existingReq = $this->canvasRepository->getAccessRequest($canvasId, $userId);
            if ($existingReq && $existingReq['status'] === 'pending') {
                return ['success' => false, 'message' => __('err_request_pending') ?? 'Ya tienes una solicitud pendiente.'];
            }

            $this->canvasRepository->createAccessRequest($canvasId, $userId);
            return ['success' => true, 'message' => __('msg_request_sent') ?? 'Solicitud de acceso enviada.'];

        } catch (Exception $e) {
            Logger::error('Error requesting access.', ['user_id' => $userId, 'canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function approveRequest(int $ownerId, int $requestId, bool $canManageOfficial = false): array {
        try {
            $request = $this->canvasRepository->getRequestById($requestId);
            if (!$request) return ['success' => false, 'message' => 'Solicitud no encontrada.'];

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
                        return ['success' => false, 'message' => 'Has alcanzado el límite máximo de participantes en este lienzo de tu plan.'];
                    }
                }
            }

            $this->canvasRepository->updateRequestStatus($requestId, 'approved');
            $this->canvasRepository->addMember($request['canvas_id'], $request['user_id'], 'editor');

            return ['success' => true, 'message' => 'Acceso aprobado.'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function rejectRequest(int $ownerId, int $requestId, bool $canManageOfficial = false): array {
        try {
            $request = $this->canvasRepository->getRequestById($requestId);
            if (!$request) return ['success' => false, 'message' => 'Solicitud no encontrada.'];

            $canvas = $this->canvasRepository->getById($request['canvas_id']);
            $isOwner = ($canvas['owner_id'] === $ownerId) || ($canvas['owner_id'] === null && $canManageOfficial);
            if (!$canvas || !$isOwner) return ['success' => false, 'message' => __('err_unauthorized')];

            $this->canvasRepository->updateRequestStatus($requestId, 'rejected');

            return ['success' => true, 'message' => 'Acceso rechazado.'];
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
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }

            $role = null;
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($canvasId, $userId);
            }
            
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$role && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para ver el timelapse de este lienzo.', 'http_code' => 403];
            }

            $baseDir = dirname(__DIR__, 2) . '/storage/private/canvases/timelapses';
            $filePath = $baseDir . '/canvas_' . $canvasId . '.jsonl';

            if (!file_exists($filePath) || filesize($filePath) === 0) {
                return ['success' => false, 'message' => 'Aún no hay datos de timelapse para este lienzo.', 'http_code' => 404];
            }

            return ['success' => true, 'file_path' => $filePath];

        } catch (Exception $e) {
            Logger::error('Error preparing timelapse download.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno al procesar la solicitud.'];
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
                return ['success' => false, 'message' => __('err_snapshot_not_found') ?? 'Snapshot no encontrado.'];
            }

            $role = null;
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($data['canvas_id'], $userId);
            }

            $isOwner = ($data['owner_id'] === $userId) || ($data['owner_id'] === null && $canManageOfficial);

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$role && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'Este lienzo es privado.'];
            }

            $imageUrl = $data['file_path'];
            if (!str_starts_with($imageUrl, '/')) {
                $imageUrl = '/' . $imageUrl;
            }

            $hasTimelapse = !empty($data['timelapse_file_path']);

            return [
                'success' => true,
                'data' => [
                    'image_url' => $imageUrl,
                    'width' => (int)$data['size'],
                    'height' => (int)$data['size'],
                    'has_timelapse' => $hasTimelapse,
                    'palette_id' => $data['palette_id'] ?? 'default'
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error getting snapshot detail.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno al procesar la solicitud.'];
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
                return ['success' => false, 'message' => 'Snapshot no encontrado.', 'http_code' => 404];
            }

            $role = null;
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($data['canvas_id'], $userId);
            }

            $isOwner = ($data['owner_id'] === $userId) || ($data['owner_id'] === null && $canManageOfficial);

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$role && !$isOwner) {
                return ['success' => false, 'message' => 'No tienes permisos para ver este timelapse.', 'http_code' => 403];
            }

            if (empty($data['timelapse_file_path'])) {
                return ['success' => false, 'message' => 'Este snapshot no cuenta con archivo de timelapse.', 'http_code' => 404];
            }

            $baseDir = dirname(__DIR__, 2) . '/storage/';
            $filePath = $baseDir . ltrim($data['timelapse_file_path'], '/');

            if (!file_exists($filePath) || filesize($filePath) === 0) {
                return ['success' => false, 'message' => 'El archivo físico del timelapse no se encuentra en el servidor.', 'http_code' => 404];
            }

            return ['success' => true, 'file_path' => $filePath];

        } catch (Exception $e) {
            Logger::error('Error preparing snapshot timelapse.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Error interno al procesar la solicitud.', 'http_code' => 500];
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
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }
            
            $role = null;
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($canvas['id'], $userId);
            }

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$role && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'Este lienzo es privado.'];
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
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno al procesar la solicitud.'];
        }
    }

    public function uploadTemplate(int $userId, array $fileInfo): array {
        try {
            if (!isset($fileInfo['error']) || is_array($fileInfo['error']) || $fileInfo['error'] !== UPLOAD_ERR_OK) {
                return ['success' => false, 'message' => 'Error en la subida del archivo o archivo ausente.'];
            }
            
            $maxSize = 5 * 1024 * 1024;
            if ($fileInfo['size'] > $maxSize) {
                return ['success' => false, 'message' => 'El archivo supera el límite de 5MB.'];
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
                return ['success' => false, 'message' => 'Formato de imagen no permitido. Usa JPG, PNG o WEBP.'];
            }

            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            $planLimits = SubscriptionPlanConstants::getTierLimits($tier);
            
            if ($planLimits['max_storage_mb'] !== -1) {
                $currentStorageMB = $this->canvasRepository->getUserStorageUsed($userId);
                $newFileMB = $fileInfo['size'] / (1024 * 1024);
                
                if (($currentStorageMB + $newFileMB) > $planLimits['max_storage_mb']) {
                    return ['success' => false, 'message' => 'Has superado el límite de almacenamiento de tu plan (' . $planLimits['max_storage_mb'] . ' MB). Libera espacio o actualiza tu plan.'];
                }
            }

            $uploadDir = dirname(__DIR__, 2) . '/storage/public/templates/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            $fileName = sprintf('%s_%s.%s', $userId, Utils::generateUUID(), $extension);
            $destination = $uploadDir . $fileName;

            if (!move_uploaded_file($fileInfo['tmp_name'], $destination)) {
                Logger::error('Fallo al mover el archivo de plantilla al File System.', ['user_id' => $userId]);
                return ['success' => false, 'message' => 'Error de escritura en el servidor.'];
            }

            $dbPath = 'public/storage/templates/' . $fileName;
            
            $templateId = $this->canvasRepository->saveTemplateMetadata($userId, $dbPath);

            return [
                'success' => true,
                'message' => 'Plantilla subida y guardada correctamente.',
                'data' => [
                    'id' => $templateId,
                    'url' => "/" . $dbPath
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error uploadTemplate.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }

    public function getUserTemplates(int $userId): array {
        try {
            $templates = $this->canvasRepository->getUserTemplates($userId);
            return ['success' => true, 'data' => $templates];
        } catch (Exception $e) {
            Logger::error('Error getUserTemplates.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error al obtener la librería.'];
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
                    $physicalPath = dirname(__DIR__, 2) . '/' . str_replace('public/storage/', 'storage/public/', ltrim($filePath, '/'));
                    if (file_exists($physicalPath)) {
                        unlink($physicalPath); 
                    }
                }
                return ['success' => true, 'message' => 'Plantilla eliminada correctamente de tu librería.'];
            }
            return ['success' => false, 'message' => 'No se pudo eliminar la plantilla o no tienes permisos.'];
        } catch (Exception $e) {
            Logger::error('Error deleteTemplate.', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno.'];
        }
    }

    public function createLiveShare(int $userId, int $canvasId, string $imgUrl, float $x, float $y, float $w, float $h, float $opacity, bool $canManageOfficial = false): array {
        try {
            $user = $this->userRepository->findById($userId);
            $tier = $user['subscription_tier'] ?? 0;
            
            if (!SubscriptionPlanConstants::hasFeature($tier, 'live_templates')) {
                return ['success' => false, 'message' => 'Tu plan actual no permite compartir plantillas en vivo. Actualiza a Pro o Advanced para usar esta herramienta.'];
            }

            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => 'Lienzo no encontrado.'];
            }
            
            $role = null;
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if (!$isOwner) {
                $role = $this->canvasRepository->getMemberRole($canvasId, $userId);
                if (!in_array($role, ['editor', 'admin'])) {
                    return ['success' => false, 'message' => 'No tienes permisos para transmitir en este lienzo.'];
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

                    return ['success' => true, 'data' => ['code' => $code]];
                }
            }

            return ['success' => false, 'message' => 'El servicio de transmisiones no está disponible.'];
        } catch (Exception $e) {
            Logger::error('Error createLiveShare.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Error interno del servidor.'];
        }
    }

    public function joinLiveShare(string $code, int $targetCanvasId): array {
        try {
            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                if ($redis) {
                    $key = CacheConstants::PREFIX_LIVE_SHARE . $code;
                    $dataRaw = $redis->get($key);
                    
                    if ($dataRaw) {
                        $data = json_decode($dataRaw, true);
                        
                        // CORRECCIÓN: Validar que la transmisión pertenezca al lienzo actual
                        if (isset($data['canvas_id']) && (int)$data['canvas_id'] !== $targetCanvasId) {
                            return ['success' => false, 'message' => 'Este código de transmisión pertenece a un lienzo diferente.'];
                        }
                        
                        return ['success' => true, 'data' => $data];
                    }
                }
            }
            return ['success' => false, 'message' => 'Sesión no encontrada o ya expiró.'];
        } catch (Exception $e) {
            Logger::error('Error joinLiveShare.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Error interno del servidor.'];
        }
    }

    public function toggleFavorite(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }

            $result = $this->canvasRepository->toggleFavorite($userId, $canvasId);

            return [
                'success' => true, 
                'message' => 'Favoritos actualizados.',
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
            
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno al procesar la solicitud.'];
        }
    }
}
?>