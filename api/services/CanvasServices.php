<?php

namespace App\Api\Services;

use Exception;
use DateTime;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
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

    /**
     * Extrae dinámicamente las paletas válidas desde la Fuente Única de la Verdad (JSON).
     */
    private function getValidPalettes(): array {
        $path = dirname(__DIR__, 2) . '/public/assets/data/palettes.json';
        if (file_exists($path)) {
            $json = file_get_contents($path);
            $data = json_decode($json, true);
            if (is_array($data)) {
                return array_keys($data); // Retorna ['default', 'neon', 'pastel', ...]
            }
        }
        return ['default']; // Fallback de emergencia
    }

    // ==========================================
    // MÉTODOS PARA HOME / EXPLORA
    // ==========================================
    
    public function getPublicCanvases(?int $currentUserId, int $limit = 20): array {
        try {
            $canvases = $this->canvasRepository->getPublicCanvases($limit);
            
            $formattedCanvases = array_map(function($canvas) use ($currentUserId) {
                // Lógica de negocio: Determinar si el usuario actual es el dueño
                $canvas['is_owner'] = ($canvas['user_id'] === $currentUserId);
                
                // Lógica de Server-Side para determinar la imagen
                // RUTA VIRTUAL (Para el cliente web)
                $snapshotPath = "public/storage/snapshots/canvas_" . $canvas['id'] . ".png";
                
                // RUTA FÍSICA (Para que PHP verifique la existencia del archivo en la nueva estructura)
                $physicalPath = dirname(__DIR__, 2) . '/storage/public/snapshots/canvas_' . $canvas['id'] . '.png';
                $snapshotUrl = null;
                
                if (file_exists($physicalPath)) {
                    $timestamp = filemtime($physicalPath);
                    $snapshotUrl = "/" . $snapshotPath . "?v=" . $timestamp;
                }
                
                // Sobrescribimos o asignamos la url final generada
                $canvas['snapshot_url'] = $snapshotUrl;
                
                return $canvas;
            }, $canvases);
            
            return ['success' => true, 'data' => $formattedCanvases];
        } catch (Exception $e) {
            Logger::error('Error getting public canvases.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error al cargar los lienzos públicos.'];
        }
    }

    public function getCanvas(?int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }
            
            $role = null;
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($canvasId, $userId);
            }
            
            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$role && $canvas['user_id'] !== $userId) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para ver este lienzo.'];
            }
            
            if ($userId !== null && $canvas['user_id'] === $userId) {
                $canvas['role'] = 'admin'; 
            } else {
                $canvas['role'] = $role ?: 'spectator'; 
            }

            $canvas['max_members'] = $canvas['max_participants'];
            $canvas['width'] = $canvas['size'];
            $canvas['height'] = $canvas['size'];
            $canvas['requires_approval'] = (bool)$canvas['requires_approval'];

            // Extraer info de reseteo si aplica
            $resetSettings = $this->canvasRepository->getResetSettings($canvasId);
            if ($resetSettings && $resetSettings['is_active']) {
                $canvas['next_reset_at'] = $resetSettings['next_reset_at']; // Formato UTC
            } else {
                $canvas['next_reset_at'] = null;
            }

            // ==========================================
            // CARGAR ESTADO DEL LIENZO (REDIS -> MYSQL)
            // ==========================================
            $redisKey = "canvas:{$canvasId}:state";
            $stateRaw = null;
            $redis = null;

            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    
                    // Sincronizar configuraciones de cooldown en caché para el Python
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

    public function createCanvas(int $userId, string $name, ?string $description, string $privacy, bool $requiresApproval = false, string $size = '64', int $limit = 10, string $paletteId = 'default', int $cooldownBatch = 5, int $cooldownSeconds = 10): array {
        try {
            $uuid = Utils::generateUUID();
            
            // Validación dinámica desde JSON
            $validPalettes = $this->getValidPalettes();
            $paletteId = in_array($paletteId, $validPalettes) ? $paletteId : 'default';

            $validPrivacies = [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE];
            $privacy = in_array($privacy, $validPrivacies) ? $privacy : DB::PRIVACY_PRIVATE;

            $canvasData = [
                'uuid'                  => $uuid,
                'user_id'               => $userId,
                'name'                  => trim($name),
                'description'           => $description ? trim($description) : null,
                'privacy'               => $privacy,
                'requires_approval'     => $requiresApproval ? 1 : 0,
                'size'                  => $size,
                'palette_id'            => $paletteId,
                'max_participants'      => $limit,
                'cooldown_pixels_batch' => max(1, $cooldownBatch),
                'cooldown_seconds'      => max(0, $cooldownSeconds)
            ];

            $canvasId = $this->canvasRepository->create($canvasData);
            $this->canvasRepository->addMember($canvasId, $userId, 'admin');

            // Sincronizar configuraciones en Redis inmediatamente para el script de Python
            try {
                if (class_exists(RedisCache::class)) {
                    $redis = (new RedisCache())->getClient();
                    if ($redis) {
                        $redis->hMSet("canvas:{$canvasId}:config", [
                            'cooldown_batch' => $canvasData['cooldown_pixels_batch'],
                            'cooldown_seconds' => $canvasData['cooldown_seconds']
                        ]);
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

    public function updateCanvas(int $userId, int $canvasId, array $data): array {
        try {
            $canvas = $this->canvasRepository->getByIdAndUser($canvasId, $userId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado o sin permisos.'];
            }

            if (empty(trim($data['name']))) {
                return ['success' => false, 'message' => __('err_canvas_name_required') ?? 'El nombre es obligatorio.'];
            }
            
            $validPrivacies = [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE];
            if (!in_array($data['privacy'], $validPrivacies)) {
                $data['privacy'] = DB::PRIVACY_PRIVATE;
            }

            // Validación dinámica desde JSON
            $validPalettes = $this->getValidPalettes();
            if (!isset($data['palette_id']) || !in_array($data['palette_id'], $validPalettes)) {
                $data['palette_id'] = $canvas['palette_id'] ?? 'default';
            }

            $data['requires_approval'] = isset($data['requires_approval']) && $data['requires_approval'] ? 1 : 0;
            
            // Asignar fallbacks si no se envían
            $data['cooldown_pixels_batch'] = isset($data['cooldown_pixels_batch']) ? max(1, (int)$data['cooldown_pixels_batch']) : ($canvas['cooldown_pixels_batch'] ?? 5);
            $data['cooldown_seconds'] = isset($data['cooldown_seconds']) ? max(0, (int)$data['cooldown_seconds']) : ($canvas['cooldown_seconds'] ?? 10);

            $updated = $this->canvasRepository->updateCanvasData($canvasId, $userId, $data);

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

    public function deleteSingleCanvas(int $userId, string $uuid): array {
        try {
            $canvas = $this->canvasRepository->getCanvasByUuid($uuid);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }
            if ($canvas['user_id'] !== $userId) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'Solo el dueño puede eliminar este lienzo.'];
            }

            $deleted = $this->canvasRepository->deleteCanvasByUuid($uuid, $userId);

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
            
            // El dueño no puede salir, solo puede eliminar el lienzo o transferirlo
            if ($canvas['user_id'] === $userId) {
                return ['success' => false, 'message' => 'Como dueño, no puedes salir del lienzo. Debes eliminarlo.'];
            }

            // Verifica si el usuario realmente es miembro (tiene un registro en la tabla pivote)
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

    public function changeMemberRole(int $requesterId, int $canvasId, int $targetUserId, string $newRole): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            $requesterRole = $this->canvasRepository->getMemberRole($canvasId, $requesterId);
            if ($canvas['user_id'] === $requesterId) $requesterRole = 'admin';

            if ($requesterRole !== 'admin') {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos de administrador en este lienzo.'];
            }

            if ($canvas['user_id'] === $targetUserId) {
                return ['success' => false, 'message' => 'No puedes cambiar el rol del creador original del lienzo.'];
            }

            $validRoles = ['viewer', 'editor', 'admin'];
            if (!in_array($newRole, $validRoles)) {
                return ['success' => false, 'message' => 'Rol inválido.'];
            }

            $updated = $this->canvasRepository->updateMemberRole($canvasId, $targetUserId, $newRole);
            if ($updated) return ['success' => true, 'message' => 'Rol actualizado correctamente.'];
            
            return ['success' => false, 'message' => 'No se pudo actualizar el rol.'];
        } catch (Exception $e) {
            Logger::error('Error changing member role.', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }

    public function removeMember(int $requesterId, int $canvasId, int $targetUserId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            $requesterRole = $this->canvasRepository->getMemberRole($canvasId, $requesterId);
            if ($canvas['user_id'] === $requesterId) $requesterRole = 'admin';

            if ($requesterRole !== 'admin') {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos de administrador en este lienzo.'];
            }

            if ($canvas['user_id'] === $targetUserId) {
                return ['success' => false, 'message' => 'No puedes expulsar al creador original del lienzo.'];
            }

            $removed = $this->canvasRepository->removeMember($canvasId, $targetUserId);
            if ($removed) return ['success true', 'message' => 'Miembro expulsado correctamente.'];
            
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

    public function getResetSettings(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getByIdAndUser($canvasId, $userId);
            if (!$canvas) {
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

    public function updateResetSettings(int $userId, int $canvasId, array $data): array {
        try {
            $canvas = $this->canvasRepository->getByIdAndUser($canvasId, $userId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para modificar este lienzo.'];
            }

            $isActive = filter_var($data['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $nextResetAt = null;
            
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
                'take_snapshot' => filter_var($data['take_snapshot'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
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

    // ==========================================
    // REINICIO INMEDIATO (MODIFICADO)
    // ==========================================
    public function resetCanvasNow(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }

            // Validar permisos (dueño o admin)
            $role = null;
            if ($canvas['user_id'] !== $userId) {
                $role = $this->canvasRepository->getMemberRole($canvasId, $userId);
                if ($role !== 'admin') {
                    return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para reiniciar este lienzo.'];
                }
            }

            // En lugar de borrar de golpe, enviamos la orden a la cola de Redis para que el Worker de Python 
            // realice el flujo completo (Bloquear -> Tomar Snapshot -> Guardar Timelapse -> Borrar Lienzo)
            try {
                if (class_exists(RedisCache::class)) {
                    $redisInstance = new RedisCache();
                    $redis = $redisInstance->getClient();
                    
                    if ($redis) {
                        $redis->sAdd("canvases:force_resets", $canvasId);
                    }
                }
            } catch (Exception $e) {
                Logger::error('Error insertando orden de reseteo forzado en Redis.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            }

            // Retornamos éxito inmediatamente. El worker ya se está encargando en background.
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

    public function approveRequest(int $ownerId, int $requestId): array {
        try {
            $request = $this->canvasRepository->getRequestById($requestId);
            if (!$request) return ['success' => false, 'message' => 'Solicitud no encontrada.'];

            $canvas = $this->canvasRepository->getByIdAndUser($request['canvas_id'], $ownerId);
            if (!$canvas) return ['success' => false, 'message' => __('err_unauthorized')];

            $this->canvasRepository->updateRequestStatus($requestId, 'approved');
            $this->canvasRepository->addMember($request['canvas_id'], $request['user_id'], 'editor');

            return ['success' => true, 'message' => 'Acceso aprobado.'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function rejectRequest(int $ownerId, int $requestId): array {
        try {
            $request = $this->canvasRepository->getRequestById($requestId);
            if (!$request) return ['success' => false, 'message' => 'Solicitud no encontrada.'];

            $canvas = $this->canvasRepository->getByIdAndUser($request['canvas_id'], $ownerId);
            if (!$canvas) return ['success' => false, 'message' => __('err_unauthorized')];

            $this->canvasRepository->updateRequestStatus($requestId, 'rejected');

            return ['success' => true, 'message' => 'Acceso rechazado.'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getPendingRequests(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getByIdAndUser($canvasId, $userId);
            if (!$canvas) return ['success' => false, 'message' => __('err_unauthorized')];

            $requests = $this->canvasRepository->getPendingRequests($canvasId);
            return ['success' => true, 'data' => $requests];
        } catch (Exception $e) {
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function prepareTimelapseDownload(?int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }

            $role = null;
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($canvasId, $userId);
            }
            
            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$role && $canvas['user_id'] !== $userId) {
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

    public function getSnapshotDetail(string $snapshotId, ?int $userId = null): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.file_path, s.timelapse_file_path, s.snapshot_uuid, c.id as canvas_id, c.size, c.privacy, c.user_id, c.palette_id 
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

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$role && $data['user_id'] !== $userId) {
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

    public function prepareSnapshotTimelapseDownload(?int $userId, string $snapshotId): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.timelapse_file_path, c.id as canvas_id, c.privacy, c.user_id 
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

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$role && $data['user_id'] !== $userId) {
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


    public function getSnapshotsGallery(string $uuid, ?int $userId = null): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);
            $stmt = $pdo->prepare("SELECT id, user_id, name, privacy FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1");
            $stmt->execute([':uuid' => $uuid]);
            $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }
            
            $role = null;
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($canvas['id'], $userId);
            }

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$role && $canvas['user_id'] !== $userId) {
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

    // ==========================================
    // LÓGICA DE PLANTILLAS DE USUARIO 
    // ==========================================
    
    public function uploadTemplate(int $userId, array $fileInfo): array {
        try {
            if (!isset($fileInfo['error']) || is_array($fileInfo['error']) || $fileInfo['error'] !== UPLOAD_ERR_OK) {
                return ['success' => false, 'message' => 'Error en la subida del archivo o archivo ausente.'];
            }
            
            // Validación de peso (5MB)
            $maxSize = 5 * 1024 * 1024;
            if ($fileInfo['size'] > $maxSize) {
                return ['success' => false, 'message' => 'El archivo supera el límite de 5MB.'];
            }

            // Validación rigurosa de MIME type
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

            // ESCRITURA FÍSICA A LA VERDADERA CARPETA PÚBLICA
            $uploadDir = dirname(__DIR__, 2) . '/storage/public/templates/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Nombre único para prevenir colisiones y caché
            $fileName = sprintf('%s_%s.%s', $userId, Utils::generateUUID(), $extension);
            $destination = $uploadDir . $fileName;

            if (!move_uploaded_file($fileInfo['tmp_name'], $destination)) {
                Logger::error('Fallo al mover el archivo de plantilla al File System.', ['user_id' => $userId]);
                return ['success' => false, 'message' => 'Error de escritura en el servidor.'];
            }

            // La ruta guardada en DB sigue siendo la virtual (Symlink) para que el frontend la lea
            $dbPath = 'public/storage/templates/' . $fileName;
            
            // Guardar en Base de Datos vía Repositorio
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
            // Obtenemos los templates para encontrar el path físico antes de borrar la metadata
            $templates = $this->canvasRepository->getUserTemplates($userId);
            $filePath = null;
            
            foreach($templates as $t) {
                if ((int)$t['id'] === $templateId) {
                    $filePath = $t['file_path'];
                    break;
                }
            }

            // Delegamos la validación de propiedad al repositorio
            $deleted = $this->canvasRepository->deleteTemplate($templateId, $userId);
            
            if ($deleted) {
                if ($filePath) {
                    // Traducimos la ruta virtual a la ruta física para la eliminación
                    $physicalPath = dirname(__DIR__, 2) . '/' . str_replace('public/storage/', 'storage/public/', ltrim($filePath, '/'));
                    if (file_exists($physicalPath)) {
                        unlink($physicalPath); // Eliminamos del servidor físico
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
}
?>