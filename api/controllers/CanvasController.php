<?php

namespace App\Api\Controllers;

use App\Api\Services\CanvasServices;
use App\Core\Interfaces\SessionManagerInterface;

class CanvasController extends BaseController {
    
    private $canvasServices;
    private $session;

    public function __construct(CanvasServices $canvasServices, SessionManagerInterface $session) {
        $this->canvasServices = $canvasServices;
        $this->session = $session;
    }

    public function get($input) {
        try {
            // Se permite acceso a invitados (modo espectador)
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $canvasId = $input['id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id') ?? 'ID de lienzo no proporcionado.']);
            }

            $result = $this->canvasServices->getCanvas($userId, (int)$canvasId);
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    // ==========================================
    // NUEVO ENDPOINT: STREAMING DEL TIMELAPSE
    // ==========================================
    public function get_timelapse($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $canvasId = $input['id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => 'ID de lienzo no proporcionado.', 'http_code' => 400]);
            }

            // Validar permisos y existencia del archivo
            $result = $this->canvasServices->prepareTimelapseDownload($userId, (int)$canvasId);

            if (!$result['success']) {
                $code = $result['http_code'] ?? 400;
                http_response_code($code);
                return $this->respond($result);
            }

            $filePath = $result['file_path'];

            // Limpiar cualquier buffer previo para evitar corromper la respuesta
            if (ob_get_level()) {
                ob_end_clean();
            }

            // Cabeceras HTTP para descarga / streaming
            header('Content-Type: application/x-ndjson');
            header('Content-Disposition: attachment; filename="timelapse_' . $canvasId . '.jsonl"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            // --- OPTIMIZACIÓN A FUTURO ---
            // Si algún día configuras Nginx con X-Accel o Apache con mod_xsendfile,
            // debes descomentar la línea correspondiente y comentar 'readfile($filePath);'.
            // Esto hará que PHP delegue la descarga 100% al servidor web (Ultra rápido).
            // header("X-Sendfile: $filePath"); // Apache
            // header("X-Accel-Redirect: /timelapses_internos/canvas_{$canvasId}.jsonl"); // Nginx
            // exit;

            // Fallback actual: Streaming directo mediante readfile. 
            // Lee directo del disco al buffer de salida de red, sin inflar la RAM.
            flush();
            readfile($filePath);
            
            // Matamos la ejecución aquí para que el framework no intente hacer un json_encode del resultado.
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

            if (empty(trim($name))) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_name_required')]);
            }

            $result = $this->canvasServices->createCanvas($userId, $name, $description, $privacy, $requiresApproval, $size, (int)$limit, $paletteId);

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
                'max_participants' => $input['max_members'] ?? null
            ];

            $result = $this->canvasServices->updateCanvas($userId, (int)$canvasId, $data);
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
            
            return $this->respond($this->canvasServices->approveRequest($userId, (int)$requestId));
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
            
            return $this->respond($this->canvasServices->rejectRequest($userId, (int)$requestId));
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
            
            return $this->respond($this->canvasServices->getPendingRequests($userId, (int)$canvasId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>