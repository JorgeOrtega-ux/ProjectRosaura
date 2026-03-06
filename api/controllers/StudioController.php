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
        if (!$this->sessionManager->isLoggedIn()) {
            echo json_encode(['status' => 'error', 'message' => 'No autorizado']);
            http_response_code(401);
            exit;
        }
        return $this->sessionManager->getUserId();
    }

    public function upload_video() {
        $userId = $this->requireAuth();

        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['video'])) {
            echo json_encode(['status' => 'error', 'message' => 'Método no permitido o archivo no enviado.']);
            return;
        }

        try {
            $videoData = $this->studioServices->queueVideoUpload($userId, $_FILES['video']);
            echo json_encode(['status' => 'success', 'data' => $videoData]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            http_response_code(400);
        }
    }

    public function upload_thumbnail() {
        $userId = $this->requireAuth();
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['thumbnail']) || !isset($_POST['video_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos obligatorios.']);
            return;
        }

        try {
            $data = $this->studioServices->uploadThumbnail($userId, (int)$_POST['video_id'], $_FILES['thumbnail']);
            echo json_encode(['status' => 'success', 'data' => $data]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            http_response_code(400);
        }
    }

    public function update_title() {
        $userId = $this->requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['video_id']) || !isset($input['title'])) {
            echo json_encode(['status' => 'error', 'message' => 'Faltan datos obligatorios.']);
            return;
        }

        try {
            $this->studioServices->updateVideoTitle($userId, (int)$input['video_id'], $input['title']);
            echo json_encode(['status' => 'success']);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            http_response_code(400);
        }
    }

    public function get_active_uploads() {
        $userId = $this->requireAuth();
        
        try {
            $videos = $this->studioServices->getActiveUploads($userId);
            echo json_encode(['status' => 'success', 'data' => $videos]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            http_response_code(500);
        }
    }
    
    public function publish_video() {
        $userId = $this->requireAuth();
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['video_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'ID de video faltante.']);
            return;
        }

        try {
            $result = $this->studioServices->publishVideo($userId, (int)$input['video_id']);
            echo json_encode(['status' => 'success', 'data' => $result]);
        } catch (\Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            http_response_code(400);
        }
    }
}
?>