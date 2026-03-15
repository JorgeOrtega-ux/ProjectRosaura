<?php
// api/controllers/FeedController.php

namespace App\Api\Controllers;

use App\Core\Repositories\VideoRepository;
use App\Core\Repositories\PlaylistRepository;
use App\Core\Repositories\RecommendationRepository;
use App\Config\RedisCache;
use App\Core\System\SessionManager;

class FeedController {
    private $videoRepo;
    private $playlistRepo;
    private $recommendationRepo;
    private $redis;
    private $session;

    // Se inyecta SessionManager en el constructor
    public function __construct(
        VideoRepository $videoRepo, 
        PlaylistRepository $playlistRepo, 
        RecommendationRepository $recommendationRepo, 
        RedisCache $redis,
        SessionManager $session
    ) {
        $this->videoRepo = $videoRepo;
        $this->playlistRepo = $playlistRepo;
        $this->recommendationRepo = $recommendationRepo;
        $this->redis = $redis;
        $this->session = $session;
    }

    public function get_feed($input) {
        $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
        
        // CORRECCIÓN: Uso correcto del SessionManager instanciado
        $userId = $this->session->get('user_id'); 
        
        $horizontalVideos = [];
        $verticalVideos = [];

        if ($userId) {
            // ALGORITMO: Buscar feed pre-calculado por los Workers de Python en Redis
            $cachedHorizontalIds = $this->redis->get("feed:user:{$userId}:horizontal");
            $cachedVerticalIds = $this->redis->get("feed:user:{$userId}:vertical");

            if ($cachedHorizontalIds) {
                $ids = json_decode($cachedHorizontalIds, true);
                $slicedIds = array_slice($ids, $offset, $limit);
                $horizontalVideos = $this->recommendationRepo->getVideosByIds($slicedIds);
            }
            
            if ($cachedVerticalIds) {
                $ids = json_decode($cachedVerticalIds, true);
                $slicedIds = array_slice($ids, $offset, $limit);
                $verticalVideos = $this->recommendationRepo->getVideosByIds($slicedIds);
            }
        }

        // FALLBACK: Si no hay feed personalizado (Cold Start o usuario anónimo)
        if (empty($horizontalVideos)) {
            $horizontalVideos = $this->recommendationRepo->getColdStartFeed($limit, $offset, 'horizontal');
        }
        if (empty($verticalVideos)) {
            $verticalVideos = $this->recommendationRepo->getColdStartFeed($limit, $offset, 'vertical');
        }

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
    
    public function get_recommendations($input) {
        $videoId = isset($input['video_id']) ? (int)$input['video_id'] : 0;
        $limit = isset($input['limit']) ? (int)$input['limit'] : 12;
        
        $videos = $this->recommendationRepo->getSimilarVideos($videoId, $limit);
        
        $formatVideos = function($videos) {
            foreach ($videos as &$video) {
                $video['avatar_url'] = !empty($video['avatar_path']) 
                    ? APP_URL . '/' . $video['avatar_path'] 
                    : APP_URL . '/public/storage/profilePictures/default/default.png'; 
                    
                $video['thumbnail_url'] = !empty($video['thumbnail_path'])
                    ? APP_URL . '/' . $video['thumbnail_path']
                    : APP_URL . '/public/assets/images/default-thumb.png'; 
            }
            return $videos;
        };
        
        return [
            'success' => true,
            'data' => $formatVideos($videos)
        ];
    }
}
?>