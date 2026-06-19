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

            // Validar que el nombre no esté vacío
            if (empty(trim($name))) {
                return ['success' => false, 'message' => __('err_canvas_name_required')];
            }

            // Ejecutar el servicio
            $result = $this->canvasServices->createCanvas($userId, $name, $description, $privacy);

            // Devolver la respuesta usando el método heredado de BaseController
            return $this->respond($result);

        } catch (\Throwable $e) {
            // Delegar el manejo de la excepción crítica al BaseController
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>