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
        
        // Consultamos ambos feeds por separado
        $horizontalVideos = $this->videoRepo->getPublicFeed($limit, $offset, 'horizontal');
        $verticalVideos = $this->videoRepo->getPublicFeed($limit, $offset, 'vertical');

        // Función anónima para mapear las URLs y limpiar la data
        $formatVideos = function($videos) {
            foreach ($videos as &$video) {
                // Validamos si tiene avatar_path, sino ponemos uno por defecto
                $video['avatar_url'] = !empty($video['avatar_path']) 
                    ? APP_URL . '/' . $video['avatar_path'] 
                    : APP_URL . '/public/storage/profilePictures/default/default.png'; 
                    
                $video['thumbnail_url'] = !empty($video['thumbnail_path'])
                    ? APP_URL . '/' . $video['thumbnail_path']
                    : APP_URL . '/public/assets/images/default-thumb.png'; 

                $video['video_url'] = !empty($video['hls_path'])
                    ? APP_URL . '/' . $video['hls_path']
                    : ''; 

                // Asegurar valores por defecto para evitar nulos en el front
                $video['duration'] = $video['duration'] ?? 0;
                $video['thumbnail_dominant_color'] = $video['thumbnail_dominant_color'] ?? 'transparent';
            }
            return $videos;
        };

        return [
            'success' => true, 
            'data' => [
                'horizontal' => $formatVideos($horizontalVideos),
                'vertical' => $formatVideos($verticalVideos)
            ]
        ];
    }
}
?>