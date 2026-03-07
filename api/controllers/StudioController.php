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

    public function get_models($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        try {
            $models = $this->studioServices->getTagsByType('modelo');
            return ['success' => true, 'status' => 'success', 'data' => $models];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function get_categories($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        try {
            $categories = $this->studioServices->getTagsByType('category');
            return ['success' => true, 'status' => 'success', 'data' => $categories];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    public function upload_video($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }

        $role = strtolower($this->sessionManager->get('user_role') ?? 'user');

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
        $thumbnailBase64 = $input['thumbnail_base64'] ?? $_POST['thumbnail_base64'] ?? null;
        $generatedPath = $input['generated_path'] ?? $_POST['generated_path'] ?? null;
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || (!$thumbnailBase64 && !$generatedPath && !isset($files['thumbnail'])) || !$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Faltan datos obligatorios para procesar la miniatura.'];
        }

        try {
            $data = $this->studioServices->uploadThumbnail($userId, (int)$videoId, $files['thumbnail'] ?? null, $thumbnailBase64, $generatedPath);
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
        $visibility = $input['visibility'] ?? $_POST['visibility'] ?? 'public';
        
        // RECIBIR TAGS COMO ARRAYS Y DECIFRAR EL JSON
        $models = isset($_POST['models']) ? json_decode($_POST['models'], true) : ($input['models'] ?? []);
        $categories = isset($_POST['categories']) ? json_decode($_POST['categories'], true) : ($input['categories'] ?? []);

        if (!$videoId || $title === null) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'Faltan datos obligatorios para el título.'];
        }

        try {
            $this->studioServices->updateVideoDetails($userId, (int)$videoId, $title, $description, $models, $categories, $visibility);
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

    public function get_all_videos($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        
        try {
            $videos = $this->studioServices->getAllVideos($userId);
            return ['success' => true, 'status' => 'success', 'data' => $videos];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }
    
    public function get_video($input) {
        $userId = $this->requireAuth();
        if (!$userId) {
            http_response_code(401);
            return ['success' => false, 'status' => 'error', 'message' => 'No autorizado'];
        }
        
        $uuid = $input['uuid'] ?? $_POST['uuid'] ?? null;
        if (!$uuid) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'UUID no proporcionado'];
        }

        try {
            $video = $this->studioServices->getVideoByUuid($userId, $uuid);
            return ['success' => true, 'status' => 'success', 'data' => $video];
        } catch (\Exception $e) {
            http_response_code(404);
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
        $title = $input['title'] ?? $_POST['title'] ?? null;
        $description = $input['description'] ?? $_POST['description'] ?? '';
        $visibility = $input['visibility'] ?? $_POST['visibility'] ?? 'public';

        // RECIBIR TAGS
        $models = isset($_POST['models']) ? json_decode($_POST['models'], true) : ($input['models'] ?? []);
        $categories = isset($_POST['categories']) ? json_decode($_POST['categories'], true) : ($input['categories'] ?? []);

        $files = $input['_files'] ?? $_FILES;
        $thumbnailFile = $files['thumbnail'] ?? null;
        $generatedPath = $input['generated_path'] ?? $_POST['generated_path'] ?? null;

        if (!$videoId) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'ID de video faltante en la petición de publicación.'];
        }

        if (empty(trim($title))) {
            http_response_code(400);
            return ['success' => false, 'status' => 'error', 'message' => 'El título es obligatorio para publicar.'];
        }

        try {
            $result = $this->studioServices->publishVideo($userId, (int)$videoId, $title, $description, $models, $categories, $thumbnailFile, $generatedPath, $visibility);
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