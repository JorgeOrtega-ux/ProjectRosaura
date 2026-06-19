<?php

namespace App\Api\Controllers;

use App\Api\Services\CanvasServices;
use App\Core\Interfaces\SessionManagerInterface;

class CanvasController extends BaseController {
    
    private $canvasServices;
    private $session;

    /**
     * El contenedor de inyección de dependencias inyecta automáticamente los servicios y la sesión.
     * No se llama a parent::__construct() porque BaseController no posee uno.
     */
    public function __construct(CanvasServices $canvasServices, SessionManagerInterface $session) {
        $this->canvasServices = $canvasServices;
        $this->session = $session;
    }

    /**
     * Devuelve la información de un lienzo específico
     */
    public function get($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond([
                    'success' => false, 
                    'message' => __('err_unauthorized'), 
                    'http_code' => 401
                ]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;

            if (!$canvasId) {
                return ['success' => false, 'message' => __('err_invalid_canvas_id') ?? 'ID de lienzo no proporcionado.'];
            }

            $result = $this->canvasServices->getCanvas($userId, (int)$canvasId);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    /**
     * El framework pasa la carga útil de la solicitud directamente al parámetro $input.
     */
    public function create($input) {
        try {
            // Verificar si el usuario tiene una sesión válida activa
            if (!$this->session->isLoggedIn()) {
                return $this->respond([
                    'success' => false, 
                    'message' => __('err_unauthorized'), 
                    'http_code' => 401
                ]);
            }

            // Obtener el ID de la cuenta activa basado en tu interfaz multi-sesión
            $userId = $this->session->getActiveAccountId();
            
            if (!$userId) {
                return $this->respond([
                    'success' => false, 
                    'message' => __('err_unauthorized'), 
                    'http_code' => 401
                ]);
            }
            
            // Asignación de variables utilizando el input procesado por el Router
            $name = $input['name'] ?? '';
            $description = $input['description'] ?? null;
            $privacy = $input['privacy'] ?? 'private';
            $size = $input['size'] ?? '64';
            $limit = $input['limit'] ?? 10;
            // Se lee palette_id, por defecto es 'default'
            $paletteId = $input['palette_id'] ?? 'default';

            // Validar que el nombre no esté vacío
            if (empty(trim($name))) {
                return ['success' => false, 'message' => __('err_canvas_name_required')];
            }

            // Ejecutar el servicio incluyendo el tamaño, el límite y la paleta
            $result = $this->canvasServices->createCanvas($userId, $name, $description, $privacy, $size, (int)$limit, $paletteId);

            // Devolver la respuesta usando el método heredado de BaseController
            return $this->respond($result);

        } catch (\Throwable $e) {
            // Delegar el manejo de la excepción crítica al BaseController
            return $this->handleException($e, __FUNCTION__);
        }
    }

    /**
     * Actualiza la configuración del lienzo BLOQUEANDO EXPLÍCITAMENTE EL TAMAÑO
     */
    public function update($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond([
                    'success' => false, 
                    'message' => __('err_unauthorized'), 
                    'http_code' => 401
                ]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            
            if (!$userId || !$canvasId) {
                return $this->respond([
                    'success' => false, 
                    'message' => __('err_unauthorized') ?? 'No autorizado.', 
                    'http_code' => 401
                ]);
            }
            
            // FILTRO DE SEGURIDAD ESTRICTO: Solo tomamos estos campos.
            // Ahora incluimos 'palette_id' en los datos autorizados para cambiar.
            $data = [
                'name' => $input['name'] ?? null,
                'description' => $input['description'] ?? null,
                'privacy' => $input['privacy'] ?? null,
                'palette_id' => $input['palette_id'] ?? null,
                'max_participants' => $input['max_members'] ?? null
            ];

            $result = $this->canvasServices->updateCanvas($userId, (int)$canvasId, $data);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    /**
     * Procesa la eliminación masiva o individual enviada desde el cliente JS centralizado.
     */
    public function delete($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_unauthorized'),
                    'http_code' => 401
                ]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_unauthorized'),
                    'http_code' => 401
                ]);
            }

            $canvasIds = $input['canvas_ids'] ?? [];
            $password = $input['password'] ?? '';

            if (empty($canvasIds)) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_no_canvases_selected') ?? 'Debe seleccionar al menos un lienzo.'
                ]);
            }

            if (empty(trim($password))) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_password_required') ?? 'Debe introducir su contraseña para confirmar.'
                ]);
            }

            $result = $this->canvasServices->deleteUserCanvases($userId, $canvasIds, $password);
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>