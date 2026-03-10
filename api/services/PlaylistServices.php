<?php
// api/services/PlaylistServices.php

namespace App\Api\Services;

use App\Core\Repositories\PlaylistRepository;
use App\Config\RedisCache;

class PlaylistServices {
    private $playlistRepo;
    private $redis;

    public function __construct(PlaylistRepository $playlistRepo) {
        $this->playlistRepo = $playlistRepo;
        try {
            // Instanciar Redis opcionalmente para evitar cuellos de botella en la visualización
            $this->redis = new RedisCache();
        } catch (\Exception $e) {
            $this->redis = null;
        }
    }

    public function getPlaylistDetails(string $uuid): ?array {
        $data = $this->playlistRepo->getPlaylistWithVideosByUuid($uuid);
        
        if (!$data) {
            return null;
        }

        // Formatear rutas (APP_URL) como se hace en el FeedController
        $data['playlist']['avatar_url'] = !empty($data['playlist']['avatar_path']) 
            ? APP_URL . '/' . $data['playlist']['avatar_path'] 
            : APP_URL . '/public/storage/profilePictures/default/default.png';

        $data['playlist']['thumbnail_url'] = !empty($data['playlist']['thumbnail_path'])
            ? APP_URL . '/' . $data['playlist']['thumbnail_path']
            : APP_URL . '/public/assets/images/default-thumb.png';

        foreach ($data['videos'] as &$video) {
            $video['thumbnail_url'] = !empty($video['thumbnail_path'])
                ? APP_URL . '/' . $video['thumbnail_path']
                : APP_URL . '/public/assets/images/default-thumb.png';
        }

        return $data;
    }
    
    // NUEVO: Lógica que estructura y almacena en caché la "queue" de la playlist
    public function getPlaylistQueueData(string $uuid): ?array {
        $cacheKey = "playlist_queue_data_{$uuid}";

        if ($this->redis && $this->redis->getClient()) {
            $cached = $this->redis->get($cacheKey);
            if ($cached) {
                return json_decode($cached, true);
            }
        }

        $data = $this->playlistRepo->getPlaylistVideosOrdered($uuid);
        
        if (empty($data) || empty($data['videos'])) {
            return null;
        }

        // Formateo de las rutas de las miniaturas y la duración
        foreach ($data['videos'] as &$video) {
            $video['thumbnail_url'] = !empty($video['thumbnail_path'])
                ? APP_URL . '/' . $video['thumbnail_path']
                : APP_URL . '/public/assets/images/default-thumb.png';
                
            if (isset($video['duration'])) {
                $m = floor($video['duration'] / 60);
                $s = $video['duration'] % 60;
                $video['duration_formatted'] = sprintf("%d:%02d", $m, $s);
            }
        }

        if ($this->redis && $this->redis->getClient()) {
            // Cachear la lista de reproducción por 1 hora
            $this->redis->set($cacheKey, json_encode($data), 3600);
        }

        return $data;
    }
}
?>