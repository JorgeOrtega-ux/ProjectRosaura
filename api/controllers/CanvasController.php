<?php
// api/controllers/CanvasController.php
namespace App\Api\Controllers;

use App\Api\Services\CanvasServices;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Security\TurnstileValidator;

class CanvasController extends BaseController {
    
    private $canvasServices;
    private $session;

    public function __construct(CanvasServices $canvasServices, SessionManagerInterface $session) {
        $this->canvasServices = $canvasServices;
        $this->session = $session;
    }

    /**
     * Función auxiliar para verificar si el usuario tiene el permiso de gestionar lienzos oficiales.
     */
    private function canManageOfficial(): bool {
        $perms = [];
        
        // Extraer de SessionManager si es posible
        if (method_exists($this->session, 'getPermissions')) {
            $perms = $this->session->getPermissions();
        }
        
        // O de la variable global de sesión nativa (Fallbacks)
        if (empty($perms) && isset($_SESSION['user_permissions'])) {
            $perms = $_SESSION['user_permissions'];
        } elseif (empty($perms) && isset($_SESSION['permissions'])) {
            $perms = $_SESSION['permissions'];
        }
        
        if (!is_array($perms)) {
            $perms = [];
        }

        // Validar si tiene un rol de administración o manejo de lienzos
        return in_array('manage_canvases', $perms) || 
               in_array('access_admin_panel', $perms) || 
               in_array('canvases.manage_official', $perms) || 
               in_array('canvases.create_official', $perms);
    }

    // ==========================================
    // MÉTODOS PARA HOME / EXPLORA / WEBSOCKETS
    // ==========================================

    public function get_ws_ticket($input) {
        try {
            $canvasId = $input['canvas_id'] ?? $input['id'] ?? null;
            
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => 'ID de lienzo no proporcionado.', 'http_code' => 400]);
            }

            $isLoggedIn = $this->session->isLoggedIn();
            $userId = $isLoggedIn ? $this->session->getActiveAccountId() : null;

            // Si es un invitado, exigimos validación de Cloudflare Turnstile
            if (!$isLoggedIn) {
                $token = $input['cf-turnstile-response'] ?? clone $input['turnstile_token'] ?? null;
                
                if (!$token) {
                    return $this->respond(['success' => false, 'message' => 'Validación de seguridad (Turnstile) requerida para espectadores.', 'http_code' => 403]);
                }
                
                $turnstile = new TurnstileValidator();
                $remoteIp = $_SERVER['REMOTE_ADDR'] ?? null;
                
                if (!$turnstile->isValid($token, $remoteIp)) {
                    return $this->respond(['success' => false, 'message' => 'Validación de seguridad fallida. Eres un bot sospechoso.', 'http_code' => 403]);
                }
            }

            // Si es logueado o pasó Turnstile, se genera el Ticket
            $result = $this->canvasServices->generateWsTicket($userId, (int)$canvasId);
            
            if (!$result['success']) {
                $code = $result['http_code'] ?? 400;
                http_response_code($code);
            }
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_public($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $limit = $input['limit'] ?? 20;

            $result = $this->canvasServices->getPublicCanvases($userId, (int)$limit);
            
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $canvasId = $input['id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id') ?? 'ID de lienzo no proporcionado.']);
            }

            $result = $this->canvasServices->getCanvas($userId, (int)$canvasId, $this->canManageOfficial());
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_timelapse($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $canvasId = $input['id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => 'ID de lienzo no proporcionado.', 'http_code' => 400]);
            }

            $result = $this->canvasServices->prepareTimelapseDownload($userId, (int)$canvasId, $this->canManageOfficial());

            if (!$result['success']) {
                $code = $result['http_code'] ?? 400;
                http_response_code($code);
                return $this->respond($result);
            }

            $filePath = $result['file_path'];

            if (ob_get_level()) {
                ob_end_clean();
            }

            header('Content-Type: application/x-ndjson');
            header('Content-Disposition: attachment; filename="timelapse_' . $canvasId . '.jsonl"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            flush();
            readfile($filePath);
            exit;

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_snapshot_timelapse($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $snapshotId = $input['id'] ?? null;

            if (!$snapshotId) {
                return $this->respond(['success' => false, 'message' => 'ID de snapshot no proporcionado.', 'http_code' => 400]);
            }

            $result = $this->canvasServices->prepareSnapshotTimelapseDownload($userId, $snapshotId, $this->canManageOfficial());

            if (!$result['success']) {
                $code = $result['http_code'] ?? 400;
                http_response_code($code);
                return $this->respond($result);
            }

            $filePath = $result['file_path'];

            if (ob_get_level()) {
                ob_end_clean();
            }

            header('Content-Type: application/x-ndjson');
            header('Content-Disposition: attachment; filename="snapshot_timelapse_' . $snapshotId . '.jsonl"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            flush();
            readfile($filePath);
            exit;

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function create($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            
            $name = $input['name'] ?? '';
            $description = $input['description'] ?? null;
            $privacy = $input['privacy'] ?? 'private';
            $requiresApproval = filter_var($input['requires_approval'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $size = $input['size'] ?? '64';
            $limit = $input['limit'] ?? 10;
            $paletteId = $input['palette_id'] ?? 'default';
            $cooldownBatch = $input['cooldown_pixels_batch'] ?? 5;
            $cooldownSeconds = $input['cooldown_seconds'] ?? 10;

            // Nuevas variables de Alcance (Scope)
            $scopeType = $input['scope_type'] ?? 'personal';
            $scopeRef1 = $input['scope_ref_1'] ?? null;
            $scopeRef2 = $input['scope_ref_2'] ?? null;
            $scopeRef3 = $input['scope_ref_3'] ?? null;

            if (empty(trim($name))) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_name_required')]);
            }

            // ==========================================
            // VALIDACIÓN ESTRICTA DEL ALCANCE
            // ==========================================
            if ($scopeType === 'global') {
                $scopeRef1 = null; 
                $scopeRef2 = null; 
                $scopeRef3 = null;
            } elseif ($scopeType === 'country' && empty($scopeRef1)) {
                return $this->respond(['success' => false, 'message' => 'Para un lienzo de país, debes especificar obligatoriamente el país.']);
            } elseif ($scopeType === 'state' && (empty($scopeRef1) || empty($scopeRef2))) {
                return $this->respond(['success' => false, 'message' => 'Para un lienzo estatal, debes especificar país y estado.']);
            } elseif ($scopeType === 'municipality' && (empty($scopeRef1) || empty($scopeRef2) || empty($scopeRef3))) {
                return $this->respond(['success' => false, 'message' => 'Para un lienzo municipal, debes especificar país, estado y municipio.']);
            } elseif ($scopeType === 'organization' && empty($scopeRef1)) {
                return $this->respond(['success' => false, 'message' => 'Para un lienzo de organización, debes especificar el nombre de la misma.']);
            }

            $result = $this->canvasServices->createCanvas(
                $userId, $name, $description, $privacy, $requiresApproval, 
                $size, (int)$limit, $paletteId, (int)$cooldownBatch, (int)$cooldownSeconds,
                $scopeType, $scopeRef1, $scopeRef2, $scopeRef3, $this->canManageOfficial()
            );

            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function update($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            
            if (!$userId || !$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized') ?? 'No autorizado.', 'http_code' => 401]);
            }
            
            $data = [
                'name' => $input['name'] ?? null,
                'description' => $input['description'] ?? null,
                'privacy' => $input['privacy'] ?? null,
                'requires_approval' => filter_var($input['requires_approval'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'palette_id' => $input['palette_id'] ?? null,
                'max_participants' => $input['max_members'] ?? null,
                'cooldown_pixels_batch' => $input['cooldown_pixels_batch'] ?? null,
                'cooldown_seconds' => $input['cooldown_seconds'] ?? null
            ];

            $result = $this->canvasServices->updateCanvas($userId, (int)$canvasId, $data, $this->canManageOfficial());
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            if ($uuid && is_string($uuid) && empty($input['canvas_ids'])) {
                $result = $this->canvasServices->deleteSingleCanvas($userId, $uuid, $this->canManageOfficial());
                return $this->respond($result);
            }

            $canvasIds = $input['canvas_ids'] ?? [];
            $password = $input['password'] ?? '';

            if (empty($canvasIds)) {
                return $this->respond(['success' => false, 'message' => __('err_no_canvases_selected') ?? 'Debe seleccionar al menos un lienzo.']);
            }

            if (empty(trim($password))) {
                return $this->respond(['success' => false, 'message' => __('err_password_required') ?? 'Debe introducir su contraseña para confirmar.']);
            }

            $result = $this->canvasServices->deleteUserCanvases($userId, $canvasIds, $password);
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function leave($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            
            if (!$uuid) {
                return $this->respond(['success' => false, 'message' => 'Lienzo no proporcionado.']);
            }

            $result = $this->canvasServices->leaveCanvas($userId, $uuid);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function change_member_role($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            $userId = $this->session->getActiveAccountId();
            
            $canvasId = $input['canvas_id'] ?? null;
            $targetUserId = $input['target_user_id'] ?? null;
            $newRole = $input['role'] ?? null;

            if (!$canvasId || !$targetUserId || !$newRole) {
                return $this->respond(['success' => false, 'message' => 'Datos incompletos para cambiar el rol.']);
            }

            $result = $this->canvasServices->changeMemberRole($userId, (int)$canvasId, (int)$targetUserId, $newRole, $this->canManageOfficial());
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function remove_member($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            $userId = $this->session->getActiveAccountId();
            
            $canvasId = $input['canvas_id'] ?? null;
            $targetUserId = $input['target_user_id'] ?? null;

            if (!$canvasId || !$targetUserId) {
                return $this->respond(['success' => false, 'message' => 'Datos incompletos para expulsar al miembro.']);
            }

            $result = $this->canvasServices->removeMember($userId, (int)$canvasId, (int)$targetUserId, $this->canManageOfficial());
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_reset_settings($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => 'Lienzo no proporcionado.']);
            }
            
            return $this->respond($this->canvasServices->getResetSettings($userId, (int)$canvasId, $this->canManageOfficial()));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function update_reset_settings($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => 'Lienzo no proporcionado.']);
            }
            
            $data = [
                'is_active' => filter_var($input['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'next_reset_at' => $input['next_reset_at'] ?? null,
                'take_snapshot' => filter_var($input['take_snapshot'] ?? true, FILTER_VALIDATE_BOOLEAN),
                'timer_action' => $input['timer_action'] ?? 'restart'
            ];
            
            return $this->respond($this->canvasServices->updateResetSettings($userId, (int)$canvasId, $data, $this->canManageOfficial()));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function reset_now($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized') ?? 'No autorizado.', 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => 'Lienzo no proporcionado.']);
            }
            
            return $this->respond($this->canvasServices->resetCanvasNow($userId, (int)$canvasId, $this->canManageOfficial()));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function request_access($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['canvas_id'] ?? null;
            if (!$canvasId) return $this->respond(['success' => false, 'message' => 'Lienzo no proporcionado.']);
            
            return $this->respond($this->canvasServices->requestAccess($userId, (int)$canvasId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function approve_request($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            $userId = $this->session->getActiveAccountId();
            $requestId = $input['request_id'] ?? null;
            if (!$requestId) return $this->respond(['success' => false, 'message' => 'Solicitud no proporcionada.']);
            
            return $this->respond($this->canvasServices->approveRequest($userId, (int)$requestId, $this->canManageOfficial()));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function reject_request($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            $userId = $this->session->getActiveAccountId();
            $requestId = $input['request_id'] ?? null;
            if (!$requestId) return $this->respond(['success' => false, 'message' => 'Solicitud no proporcionada.']);
            
            return $this->respond($this->canvasServices->rejectRequest($userId, (int)$requestId, $this->canManageOfficial()));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_pending_requests($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['canvas_id'] ?? null;
            if (!$canvasId) return $this->respond(['success' => false, 'message' => 'Lienzo no proporcionado.']);
            
            return $this->respond($this->canvasServices->getPendingRequests($userId, (int)$canvasId, $this->canManageOfficial()));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_snapshots_gallery($input) {
        try {
            $uuid = $input['uuid'] ?? null;
            if (!$uuid) {
                return $this->respond(['success' => false, 'message' => 'UUID no proporcionado.']);
            }
            
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;

            $result = $this->canvasServices->getSnapshotsGallery($uuid, $userId, $this->canManageOfficial());
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_snapshot_detail($input) {
        try {
            $id = $input['id'] ?? null;
            if (!$id) {
                return $this->respond(['success' => false, 'message' => 'ID de snapshot no proporcionado.']);
            }
            
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;

            $result = $this->canvasServices->getSnapshotDetail($id, $userId, $this->canManageOfficial());
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    // ==========================================
    // ENDPOINTS DE PLANTILLAS DE USUARIO
    // ==========================================

    public function upload_template($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized') ?? 'No autorizado.', 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            
            if (!isset($_FILES['file'])) {
                return $this->respond(['success' => false, 'message' => 'No se detectó ningún archivo en la solicitud.']);
            }

            $result = $this->canvasServices->uploadTemplate($userId, $_FILES['file']);
            return $this->respond($result);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_templates($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized') ?? 'No autorizado.', 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $result = $this->canvasServices->getUserTemplates($userId);
            
            return $this->respond($result);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete_template($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized') ?? 'No autorizado.', 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $templateId = $input['id'] ?? null;
            
            if (!$templateId) {
                return $this->respond(['success' => false, 'message' => 'ID de plantilla no proporcionado.']);
            }

            $result = $this->canvasServices->deleteTemplate($userId, (int)$templateId);
            return $this->respond($result);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    // ==========================================
    // ENDPOINTS LIVE SHARE
    // ==========================================

    public function create_live_share($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized') ?? 'No autorizado.', 'http_code' => 401]);
            }
            $userId = $this->session->getActiveAccountId();
            
            $canvasId = $input['canvas_id'] ?? null;
            $imgUrl = $input['img_url'] ?? null;
            $x = $input['x'] ?? 0;
            $y = $input['y'] ?? 0;
            $w = $input['w'] ?? 100;
            $h = $input['h'] ?? 100;
            $opacity = $input['opacity'] ?? 1;

            if (!$canvasId || !$imgUrl) {
                return $this->respond(['success' => false, 'message' => 'Faltan parámetros requeridos para crear la sesión.']);
            }

            $result = $this->canvasServices->createLiveShare($userId, (int)$canvasId, $imgUrl, (float)$x, (float)$y, (float)$w, (float)$h, (float)$opacity, $this->canManageOfficial());
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function join_live_share($input) {
        try {
            $code = $input['code'] ?? $input['id'] ?? null;

            if (!$code) {
                $uriParts = explode('/', trim($_SERVER['REQUEST_URI'] ?? '', '/'));
                $code = end($uriParts);
            }

            if (!$code || strlen($code) < 5) {
                return $this->respond(['success' => false, 'message' => 'Código de sesión inválido.']);
            }

            $result = $this->canvasServices->joinLiveShare(strtoupper($code));
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_official($input) {
        try {
            $result = $this->canvasServices->getOfficialCanvases();
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    // ==========================================
    // NUEVO MÉTODO: TOGGLE FAVORITOS
    // ==========================================
    public function toggle_favorite($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized') ?? 'No autorizado.', 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? $input['canvas_id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => 'ID de lienzo no proporcionado.']);
            }

            $result = $this->canvasServices->toggleFavorite($userId, (int)$canvasId);
            return $this->respond($result);

        } catch (\Throwable $e) {
            // El Logger registrará silenciosamente la excepción según las instrucciones
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>