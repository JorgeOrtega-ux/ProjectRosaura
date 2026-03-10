<?php
// api/controllers/VideoController.php

namespace App\Api\Controllers;

use App\Core\Interfaces\VideoRepositoryInterface;

class VideoController {
    private $videoRepo;

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

        $videoData = $this->videoRepo->getPublicVideoDetails($videoUuid);

        if (!$videoData) {
            http_response_code(404);
            return [
                'success' => false, 
                'code' => 404, 
                'message' => 'El video no existe, está en revisión o es privado.'
            ];
        }

        // Ocultamos la ruta estática para forzar el uso de tokens firmados
        unset($videoData['file_path']);
        // Agregamos bandera para que el frontend sepa que debe invocar al motor de firmado
        $videoData['requires_signed_token'] = true;

        return ['success' => true, 'data' => $videoData];
    }
}
?>