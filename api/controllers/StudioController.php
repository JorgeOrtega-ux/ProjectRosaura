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

        // --- CORRECCIÓN AQUÍ ---
        // AuthServices guarda el rol como 'user_role', no como 'role'
        $role = strtolower($this->sessionManager->get('user_role') ?? 'user');

        // --- NUEVA LÓGICA DE PRE-VALIDACIÓN (Evita gastar ancho de banda y disco) ---
        $isPreCheck = isset($input['pre_check']) ? (bool)$input['pre_check'] : (isset($_POST['pre_check']) ? (bool)$_POST['pre_check'] : false);
        if ($isPreCheck) {
            $totalSize = isset($input['total_size']) ? (int)$input['total_size'] : (isset($_POST['total_size']) ? (int)$_POST['total_size'] : 0);
            try {
                $this->studioServices->validatePreUpload($userId, $role, $totalSize);
                return ['success' => true, 'status' => 'success', 'message' => 'Validación pre-subida exitosa'];
            } catch (\Exception $e) {
                http_response_code(400);
                return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
            }
        }
        // -----------------------------------------------------------------------------

        $files = $input['_files'] ?? $_FILES;
        $uploadId = $input['upload_id'] ?? $_POST['upload_id'] ?? null;
        $chunkIndex = isset($input['chunk_index']) ? (int)$input['chunk_index'] : (isset($_POST['chunk_index']) ? (int)$_POST['chunk_index'] : null);
        $totalChunks = isset($input['total_chunks']) ? (int)$input['total_chunks'] : (isset($_POST['total_chunks']) ? (int)$_POST['total_chunks'] : null);
        $originalFilename = $input['original_filename'] ?? $_POST['original_filename'] ?? null;
        $totalSize = isset($input['total_size']) ? (int)$input['total_size'] : (isset($_POST['total_size']) ? (int)$_POST['total_size'] : null);

        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($files['video'])) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Método no permitido o archivo no enviado.'];
        }

        try {
            if ($uploadId !== null && $chunkIndex !== null && $totalChunks !== null && $originalFilename) {
                // Pasamos el $totalSize para que el primer chunk valide el tamaño real
                $videoData = $this->studioServices->handleChunkUpload($userId, $role, $files['video'], $uploadId, $chunkIndex, $totalChunks, $originalFilename, $totalSize);
                return ['success' => true, 'status' => 'success', 'data' => $videoData];
            } else {
                $videoData = $this->studioServices->queueVideoUpload($userId, $role, $files['video']);
                return ['success' => true, 'status' => 'success', 'data' => $videoData];
            }
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
        
        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($files['thumbnail']) || !$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Faltan datos obligatorios para la miniatura.'];
        }

        try {
            $data = $this->studioServices->uploadThumbnail($userId, (int)$videoId, $files['thumbnail']);
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

        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;
        $title = $input['title'] ?? $_POST['title'] ?? null;
        $description = $input['description'] ?? $_POST['description'] ?? null;

        if (!$videoId || $title === null) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Faltan datos obligatorios para el título.'];
        }

        try {
            $this->studioServices->updateVideoDetails($userId, (int)$videoId, $title, $description);
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

        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;

        if (!$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de video faltante en la petición de publicación.'];
        }

        try {
            $result = $this->studioServices->publishVideo($userId, (int)$videoId);
            return ['success' => true, 'status' => 'success', 'data' => $result];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function cancel_upload($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $videoId = $input['video_id'] ?? $_POST['video_id'] ?? null;

        if (!$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de video faltante en la petición de cancelación.'];
        }

        try {
            $this->studioServices->cancelUpload($userId, (int)$videoId);
            return ['success' => true, 'status' => 'success'];
        } catch (\Exception $e) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }
}
?>