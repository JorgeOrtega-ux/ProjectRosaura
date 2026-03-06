<?php
// api/controllers/StudioController.php

namespace App\Api\Controllers;

use App\Api\Services\StudioServices;
use App\Core\System\SessionManager;
use App\Core\Helpers\Utils;

class StudioController {
    private $studioServices;
    private $sessionManager;

    public function __construct(StudioServices $studioServices, SessionManager $sessionManager) {
        $this->studioServices = $studioServices;
        $this->sessionManager = $sessionManager;
    }

    /**
     * Verifica la sesión utilizando los métodos nativos del SessionManager.
     * Retorna el ID del usuario si está autenticado, o false en caso contrario.
     */
    private function requireAuth() {
        if (!$this->sessionManager->has('user_id')) {
            return false;
        }
        return $this->sessionManager->get('user_id');
    }

    public function upload_video($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        // api/index.php intercepta los archivos y los manda dentro de $input['_files']
        $files = $input['_files'] ?? $_FILES;

        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($files['video'])) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Método no permitido o archivo no enviado.'];
        }

        try {
            $videoData = $this->studioServices->queueVideoUpload($userId, $files['video']);
            return ['success' => true, 'status' => 'success', 'data' => $videoData];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function upload_thumbnail($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $files = $input['_files'] ?? $_FILES;
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($files['thumbnail']) || !isset($input['video_id'])) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Faltan datos obligatorios.'];
        }

        try {
            $data = $this->studioServices->uploadThumbnail($userId, (int)$input['video_id'], $files['thumbnail']);
            return ['success' => true, 'status' => 'success', 'data' => $data];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function update_title($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        if (!isset($input['video_id']) || !isset($input['title'])) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Faltan datos obligatorios.'];
        }

        try {
            $this->studioServices->updateVideoTitle($userId, (int)$input['video_id'], $input['title']);
            return ['success' => true, 'status' => 'success'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function get_active_uploads($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        
        try {
            $videos = $this->studioServices->getActiveUploads($userId);
            return ['success' => true, 'status' => 'success', 'data' => $videos];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }
    
    public function publish_video($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        if (!isset($input['video_id'])) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de video faltante.'];
        }

        try {
            $result = $this->studioServices->publishVideo($userId, (int)$input['video_id']);
            return ['success' => true, 'status' => 'success', 'data' => $result];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }
}
?>