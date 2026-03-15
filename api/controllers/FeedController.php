<?php
// api/controllers/FeedController.php

namespace App\Api\Controllers;

use App\Core\Repositories\VideoRepository;
use App\Core\Repositories\PlaylistRepository;
// Se asume que añadirás esto más adelante cuando modifiques los repositorios
// use App\Core\Repositories\HistoryRepository; 
// use App\Core\Repositories\TagRepository;

class FeedController {
    private $videoRepo;
    private $playlistRepo;

    public function __construct(VideoRepository $videoRepo, PlaylistRepository $playlistRepo) {
        $this->videoRepo = $videoRepo;
        $this->playlistRepo = $playlistRepo;
    }

    public function get_feed($input) {
        $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        $category = (isset($input['category']) && $input['category'] !== 'all') ? $input['category'] : null;
        
        // Consultamos feeds por separado con soporte de categoría
        // NOTA: Se requiere actualizar $this->videoRepo->getPublicFeed() para que acepte el parámetro $category.
        $horizontalVideos = $this->videoRepo->getPublicFeed($limit, $offset, 'horizontal', $category);
        $verticalVideos = $this->videoRepo->getPublicFeed($limit, $offset, 'vertical', $category);
        
        // El feed de playlists generalmente no se filtra por categoría (o puedes adaptarlo luego si lo deseas)
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
        // AQUÍ ES DONDE RESIDIRÁ LA MAGIA DEL ALGORITMO (TELEMETRÍA)
        // Por ahora, y asumiendo que el HistoryRepo y TagRepo se modificarán después,
        // esto simula la orquestación. Devuelvo algunas categorías top genéricas como estructura base.
        
        // $userId = Auth::getUserId();
        // if ($userId) {
        //     $categories = $this->historyRepo->getUserTopCategories($userId, 5);
        //     if (empty($categories)) {
        //         $categories = $this->tagRepo->getGlobalTopCategories(5);
        //     }
        // } else {
        //     $categories = $this->tagRepo->getGlobalTopCategories(5);
        // }

        // Mock mientras construyes el backend de BD:
        $categories = [
            ['slug' => 'gaming', 'name' => 'Gaming'],
            ['slug' => 'music', 'name' => 'Música'],
            ['slug' => 'vlogs', 'name' => 'Vlogs'],
            ['slug' => 'tech', 'name' => 'Tecnología'],
            ['slug' => 'education', 'name' => 'Educación']
        ];

        return [
            'success' => true,
            'data' => [
                'categories' => $categories
            ]
        ];
    }
}
?>