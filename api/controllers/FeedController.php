<?php
// api/controllers/FeedController.php

namespace App\Api\Controllers;

use App\Core\Repositories\VideoRepository;
use App\Core\Repositories\PlaylistRepository;

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
        
        // Consultamos feeds por separado
        $horizontalVideos = $this->videoRepo->getPublicFeed($limit, $offset, 'horizontal');
        $verticalVideos = $this->videoRepo->getPublicFeed($limit, $offset, 'vertical');
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
}
?>