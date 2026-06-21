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

    public function createCanvas(int $userId, string $name, ?string $description, string $privacy, bool $requiresApproval = false, string $size = '64', int $limit = 10, string $paletteId = 'default'): array {
        try {
            $uuid = Utils::generateUUID();
            
            // Validación dinámica desde JSON
            $validPalettes = $this->getValidPalettes();
            $paletteId = in_array($paletteId, $validPalettes) ? $paletteId : 'default';

            $validPrivacies = [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE];
            $privacy = in_array($privacy, $validPrivacies) ? $privacy : DB::PRIVACY_PRIVATE;

            $canvasData = [
                'uuid'              => $uuid,
                'user_id'           => $userId,
                'name'              => trim($name),
                'description'       => $description ? trim($description) : null,
                'privacy'           => $privacy,
                'requires_approval' => $requiresApproval ? 1 : 0,
                'size'              => $size,
                'palette_id'        => $paletteId,
                'max_participants'  => $limit
            ];

            $canvasId = $this->canvasRepository->create($canvasData);
            $this->canvasRepository->addMember($canvasId, $userId, 'admin');

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

            $updated = $this->canvasRepository->updateCanvasData($canvasId, $userId, $data);

            if ($updated) {
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
                    if (class_exists(RedisCache::class)) {
                        $redisInstance = new RedisCache();
                        $redis = $redisInstance->getClient();
                        if ($redis) {
                            foreach ($canvasIds as $id) {
                                $redis->del("canvas:{$id}:state");
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

            $baseDir = dirname(__DIR__, 2) . '/storage/canvases/timelapses';
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

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && $canvas['user_id'] !== $userId) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'Este lienzo es privado.'];
            }

            $history = $this->canvasRepository->getSnapshotsHistoryByUuid($uuid);

            $formattedHistory = array_map(function($item) {
                return [
                    'id' => $item['id'],
                    'url' => $item['file_path'],
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
    // NUEVO MÉTODO: OBTENER DETALLE DEL SNAPSHOT
    // ==========================================
    public function getSnapshotDetail(string $snapshotId, ?int $userId = null): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            // Buscar el snapshot y unirse con el lienzo para obtener dimensiones y confirmar privacidad
            $stmt = $pdo->prepare("
                SELECT s.file_path, s.snapshot_uuid, c.size, c.privacy, c.user_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_uuid = c.uuid
                WHERE s.snapshot_uuid = :snapshot_id 
                LIMIT 1
            ");
            $stmt->execute([':snapshot_id' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return ['success' => false, 'message' => __('err_snapshot_not_found') ?? 'Snapshot no encontrado.'];
            }

            // Validar privacidad
            if ($data['privacy'] === DB::PRIVACY_PRIVATE && $data['user_id'] !== $userId) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'Este lienzo es privado.'];
            }

            $imageUrl = $data['file_path'];
            // Asegurarse de que la ruta comience con '/'
            if (!str_starts_with($imageUrl, '/')) {
                $imageUrl = '/' . $imageUrl;
            }

            return [
                'success' => true,
                'data' => [
                    'image_url' => $imageUrl,
                    'width' => (int)$data['size'],
                    'height' => (int)$data['size']
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error getting snapshot detail.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno al procesar la solicitud.'];
        }
    }
}
?>