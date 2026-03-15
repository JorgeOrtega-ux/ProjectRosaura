<?php
// api/controllers/FeedController.php

namespace App\Api\Controllers;

use App\Core\Repositories\VideoRepository;
use App\Core\Repositories\PlaylistRepository;
use App\Core\Repositories\TagRepository;
// use App\Core\Repositories\HistoryRepository; 

class FeedController {
    private $videoRepo;
    private $playlistRepo;
    private $tagRepo;

    public function __construct(VideoRepository $videoRepo, PlaylistRepository $playlistRepo, TagRepository $tagRepo) {
        $this->videoRepo = $videoRepo;
        $this->playlistRepo = $playlistRepo;
        $this->tagRepo = $tagRepo;
    }

    public function get_feed($input) {
        $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $category = (isset($input['category']) && $input['category'] !== 'all') ? $input['category'] : null;
        
        // Consultamos feeds por separado con soporte de categoría
        $horizontalVideos = $this->videoRepo->getPublicFeed($limit, $offset, 'horizontal', $category);
        $verticalVideos = $this->videoRepo->getPublicFeed($limit, $offset, 'vertical', $category);
        
        // El feed de playlists generalmente no se filtra por categoría
        $publicPlaylists = $this->playlistRepo->getPublicPlaylistsFeed($limit, $offset);

        $formatVideos = function($videos) {
            foreach ($videos as &$video) {
                $video['avatar_url'] = !empty($video['avatar_path']) 
                    ? APP_URL . '/' . $video['avatar_path'] 
                    : APP_URL . '/public/storage/profilePictures/default/default.png'; 
                    
                $video['thumbnail_url'] = !empty($video['thumbnail_path'])
                    ? APP_URL . '/' . $video['thumbnail_path']
                    : APP_URL . '/public/assets/images/default-thumb.png'; 

                $video['video_url'] = !empty($video['hls_path'])
                    ? APP_URL . '/' . $video['hls_path']
                    : ''; 

                $video['duration'] = $video['duration'] ?? 0;
                $video['thumbnail_dominant_color'] = $video['thumbnail_dominant_color'] ?? 'transparent';
            }
            return $videos;
        };

        $formatPlaylists = function($playlists) {
            foreach ($playlists as &$playlist) {
                $playlist['avatar_url'] = !empty($playlist['avatar_path']) 
                    ? APP_URL . '/' . $playlist['avatar_path'] 
                    : APP_URL . '/public/storage/profilePictures/default/default.png'; 
                    
                $playlist['thumbnail_url'] = !empty($playlist['thumbnail_path'])
                    ? APP_URL . '/' . $playlist['thumbnail_path']
                    : APP_URL . '/public/assets/images/default-thumb.png'; 

                $playlist['video_count'] = $playlist['video_count'] ?? 0;
                $playlist['thumbnail_dominant_color'] = $playlist['thumbnail_dominant_color'] ?? 'transparent';
            }
            return $playlists;
        };

        return [
            'success' => true, 
            'data' => [
                'horizontal' => $formatVideos($horizontalVideos),
                'vertical' => $formatVideos($verticalVideos),
                'playlists' => $formatPlaylists($publicPlaylists)
            ]
        ];
    }

    public function get_feed_filters($input) {
        // Obtenemos los 6 mejores modelos y 4 mejores categorías basados en VISTAS REALES
        $categories = $this->tagRepo->getGlobalTopCategories(6);
        $models = $this->tagRepo->getGlobalTopModels(4);

        // Combinamos y aseguramos que haya datos
        $filters = array_merge($categories ?: [], $models ?: []);

        // Ordenamos la combinación final de mayor a menor cantidad de visualizaciones
        usort($filters, function($a, $b) {
            return $b['total_views'] <=> $a['total_views'];
        });

        return [
            'success' => true,
            'data' => [
                'categories' => $filters
            ]
        ];
    }
}
?>