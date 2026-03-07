<?php
// api/controllers/FeedController.php

namespace App\Api\Controllers;

use App\Core\Repositories\VideoRepository;

class FeedController {
    private $videoRepo;

    public function __construct(VideoRepository $videoRepo) {
        $this->videoRepo = $videoRepo;
    }

    public function get_feed($input) {
        $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        
        $videos = $this->videoRepo->getPublicFeed($limit, $offset);

        // Preparamos las URLs completas y campos extra para el frontend
        foreach ($videos as &$video) {
            // Validamos si tiene avatar_path, sino ponemos uno por defecto
            $video['avatar_url'] = !empty($video['avatar_path']) 
                ? APP_URL . '/' . $video['avatar_path'] 
                : APP_URL . '/public/storage/profilePictures/default/default.png'; 
                
            $video['thumbnail_url'] = !empty($video['thumbnail_path'])
                ? APP_URL . '/' . $video['thumbnail_path']
                : APP_URL . '/public/assets/images/default-thumb.png'; 

            // --- NUEVO: Generar la URL del video para que HomeController.js la pueda leer ---
            // Usamos hls_path porque vimos en bd.sql que usas ese formato para los streams
            $video['video_url'] = !empty($video['hls_path'])
                ? APP_URL . '/' . $video['hls_path']
                : ''; 
            // ---------------------------------------------------------------------------------

            // Asegurar valores por defecto para evitar nulos en el front
            $video['duration'] = $video['duration'] ?? 0;
            $video['thumbnail_dominant_color'] = $video['thumbnail_dominant_color'] ?? 'transparent';
        }

        return ['success' => true, 'data' => $videos];
    }
}
?>