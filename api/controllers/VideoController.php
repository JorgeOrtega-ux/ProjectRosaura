<?php
// api/controllers/VideoController.php

namespace App\Api\Controllers;

use App\Core\Interfaces\VideoRepositoryInterface;

class VideoController {
    private $videoRepo;

    // El Container inyectará automáticamente el VideoRepository gracias al binding
    public function __construct(VideoRepositoryInterface $videoRepo) {
        $this->videoRepo = $videoRepo;
    }

    public function getVideoDetails($input) {
        $videoUuid = $input['video_uuid'] ?? null;

        if (empty($videoUuid)) {
            return ['success' => false, 'code' => 400, 'message' => 'No se proporcionó un ID de video.'];
        }

        // VALIDACIÓN ESTRICTA: Formato UUID (8-4-4-4-12)
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $videoUuid)) {
            http_response_code(404);
            return [
                'success' => false, 
                'code' => 404, 
                'message' => 'El formato del enlace no es válido o está corrupto.'
            ];
        }

        // Llamamos directamente al repositorio usando el método que creamos en el paso anterior
        $videoData = $this->videoRepo->getPublicVideoDetails($videoUuid);

        if (!$videoData) {
            http_response_code(404);
            return [
                'success' => false, 
                'code' => 404, 
                'message' => 'El video no existe, está en revisión o es privado.'
            ];
        }

        return ['success' => true, 'data' => $videoData];
    }
}
?>