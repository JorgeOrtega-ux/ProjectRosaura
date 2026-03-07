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

        // Preparamos las URLs completas para el frontend
        foreach ($videos as &$video) {
            // Validamos si tiene avatar_path, sino ponemos uno por defecto
            $video['avatar_url'] = !empty($video['avatar_path']) 
                ? APP_URL . '/' . $video['avatar_path'] 
                : APP_URL . '/public/storage/profilePictures/default/default.png'; // Ajusta la ruta a tu default
                
            $video['thumbnail_url'] = !empty($video['thumbnail_path'])
                ? APP_URL . '/' . $video['thumbnail_path']
                : APP_URL . '/public/assets/images/default-thumb.png'; // Ajusta tu imagen default si no tiene miniatura
        }

        return ['success' => true, 'data' => $videos];
    }
}
?>