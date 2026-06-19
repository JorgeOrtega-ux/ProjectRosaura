<?php

namespace App\Api\Services;

use Exception;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;

class CanvasServices {
    private $canvasRepository;
    private $userRepository;

    public function __construct(CanvasRepositoryInterface $canvasRepository, UserRepositoryInterface $userRepository) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
    }

    public function getCanvas(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getByIdAndUser($canvasId, $userId);
            
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado o no autorizado.'];
            }
            
            // Adaptamos la clave para el frontend
            $canvas['max_members'] = $canvas['max_participants'];
            $canvas['width'] = $canvas['size'];
            $canvas['height'] = $canvas['size'];

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

    public function createCanvas(int $userId, string $name, ?string $description, string $privacy, string $size = '64', int $limit = 10): array {
        try {
            $uuid = Utils::generateUUID();
            
            $canvasData = [
                'uuid'             => $uuid,
                'user_id'          => $userId,
                'name'             => trim($name),
                'description'      => $description ? trim($description) : null,
                'privacy'          => in_array($privacy, [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE, DB::PRIVACY_UNLISTED]) ? $privacy : DB::PRIVACY_PRIVATE,
                'size'             => $size,
                'max_participants' => $limit
            ];

            $canvasId = $this->canvasRepository->create($canvasData);
            
            // Asignar al creador como admin en canvas_members
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
            // Verificar existencia y propiedad
            $canvas = $this->canvasRepository->getByIdAndUser($canvasId, $userId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado o sin permisos.'];
            }

            if (empty(trim($data['name']))) {
                return ['success' => false, 'message' => __('err_canvas_name_required') ?? 'El nombre es obligatorio.'];
            }
            
            $validPrivacies = [DB::PRIVACY_PUBLIC, DB::PRIVACY_PRIVATE, DB::PRIVACY_UNLISTED];
            if (!in_array($data['privacy'], $validPrivacies)) {
                $data['privacy'] = DB::PRIVACY_PRIVATE;
            }

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
            if (!$user) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $passwordHash = $user['password_hash'] ?? $user['password'] ?? '';
            if (!password_verify($password, $passwordHash)) {
                return ['success' => false, 'message' => __('err_invalid_password') ?? 'Contraseña incorrecta.'];
            }

            $deleted = $this->canvasRepository->deleteCanvases($canvasIds, $userId);

            if ($deleted) {
                return ['success' => true, 'message' => __('msg_canvases_deleted') ?? 'Lienzos eliminados correctamente.'];
            }

            return ['success' => false, 'message' => __('err_canvases_delete_failed') ?? 'Error al eliminar los lienzos.'];
        } catch (Exception $e) {
            Logger::error('Error deleting canvases.', [
                'user_id' => $userId,
                'exception' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
?>