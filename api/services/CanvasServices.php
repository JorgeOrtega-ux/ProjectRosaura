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

    // MODIFICADO: Acepta ?int para permitir invitados (null)
    public function getCanvas(?int $userId, int $canvasId): array {
        try {
            // 1. Obtenemos el lienzo sin restringir que deba ser obligatoriamente el dueño
            $canvas = $this->canvasRepository->getById($canvasId);
            
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }
            
            // 2. Buscamos qué rol tiene el usuario en este lienzo en específico (Solo si está logueado)
            $role = null;
            if ($userId !== null) {
                $role = $this->canvasRepository->getMemberRole($canvasId, $userId);
            }
            
            // 3. Verificamos permisos si el lienzo es privado.
            // Si es privado, y el usuario no es el dueño ni tiene un rol asignado, lo bloqueamos.
            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$role && $canvas['user_id'] !== $userId) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para ver este lienzo.'];
            }
            
            // 4. Inyectamos el rol explícitamente para que el frontend lo sepa
            if ($userId !== null && $canvas['user_id'] === $userId) {
                $canvas['role'] = 'admin'; // El dueño siempre es administrador
            } else {
                $canvas['role'] = $role ?: 'spectator'; // Si es público y no tiene rol (o es invitado), entra como espectador
            }

            // Mapeo de propiedades extra para el frontend
            $canvas['max_members'] = $canvas['max_participants'];
            $canvas['width'] = $canvas['size'];
            $canvas['height'] = $canvas['size'];
            $canvas['requires_approval'] = (bool)$canvas['requires_approval'];

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
            
            $validPalettes = ['default', 'neon', 'pastel'];
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

            $validPalettes = ['default', 'neon', 'pastel'];
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

    // --- LÓGICA DE SOLICITUDES DE ACCESO ---

    public function requestAccess(int $userId, int $canvasId): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];
            }

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
}
?>