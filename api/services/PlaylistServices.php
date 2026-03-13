<?php
// api/services/PlaylistServices.php

namespace App\Api\Services;

use App\Core\Repositories\PlaylistRepository;
use App\Core\Interfaces\SessionManagerInterface;
use App\Config\RedisCache;
use App\Core\Helpers\Utils;

class PlaylistServices {
    private $playlistRepo;
    private $sessionManager;
    private $redis;

    public function __construct(PlaylistRepository $playlistRepo, SessionManagerInterface $sessionManager) {
        $this->playlistRepo = $playlistRepo;
        $this->sessionManager = $sessionManager;
        try {
            $this->redis = new RedisCache();
        } catch (\Exception $e) {
            $this->redis = null;
        }
    }

    public function getPlaylistDetails(string $uuid): ?array {
        // Intercepción del alias WL
        if ($uuid === 'WL') {
            $userId = $this->sessionManager->get('user_id');
            if (!$userId) return null; // Requiere estar logueado para ver sus listas de sistema
            $systemList = $this->playlistRepo->getPlaylistByAliasAndUser('WL', $userId);
            if ($systemList) {
                $uuid = $systemList['uuid'];
                // Forzamos temporalmente la visibilidad para que pase los checks de privacidad
                $isSystemBypass = true;
            } else {
                return null;
            }
        }

        $data = $this->playlistRepo->getPlaylistWithVideosByUuid($uuid);
        
        if (!$data && isset($isSystemBypass)) {
            $playlist = $this->playlistRepo->getByUuidAndUserId($uuid, $userId);
            if ($playlist) {
                $videos = $this->playlistRepo->getVideosByPlaylistId($playlist['id']);
                $data = ['playlist' => $playlist, 'videos' => $videos];
            }
        }

        if (!$data) return null;

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
    
    public function getPlaylistQueueData(string $uuid): ?array {
        if ($uuid === 'WL') {
            $userId = $this->sessionManager->get('user_id');
            if (!$userId) return null;
            $systemList = $this->playlistRepo->getPlaylistByAliasAndUser('WL', $userId);
            if ($systemList) {
                $uuid = $systemList['uuid'];
            } else {
                return null;
            }
        }

        $cacheKey = "playlist_queue_data_{$uuid}";

        if ($this->redis && $this->redis->getClient()) {
            $cached = $this->redis->get($cacheKey);
            if ($cached) return json_decode($cached, true);
        }

        $data = $this->playlistRepo->getPlaylistVideosOrdered($uuid);
        
        if (empty($data)) {
            $userId = $this->sessionManager->get('user_id');
            if ($userId) {
                $playlist = $this->playlistRepo->getByUuidAndUserId($uuid, $userId);
                if ($playlist) {
                    $videos = $this->playlistRepo->getVideosByPlaylistId($playlist['id']);
                    $data = ['title' => $playlist['title'], 'type' => $playlist['type'], 'videos' => $videos];
                }
            }
        }

        if (empty($data) || empty($data['videos'])) return null;

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
            $this->redis->set($cacheKey, json_encode($data), 3600);
        }

        return $data;
    }

    public function getPlaylistsForVideo(int $userId, int $videoId): array {
        return $this->playlistRepo->getUserPlaylistsWithVideoStatus($userId, $videoId);
    }

    public function toggleVideoInPlaylist(int $userId, string $playlistUuid, int $videoId): array {
        $playlist = $this->playlistRepo->getByUuidAndUserId($playlistUuid, $userId);
        if (!$playlist) {
            return ['success' => false, 'message' => 'Lista de reproducción no encontrada o no tienes permisos.'];
        }

        $playlistId = $playlist['id'];
        $isInPlaylist = $this->playlistRepo->isVideoInPlaylist($playlistId, $videoId);

        if ($isInPlaylist) {
            $this->playlistRepo->removeVideoFromPlaylist($playlistId, $videoId);
            return ['success' => true, 'action' => 'removed', 'message' => 'Video eliminado de la lista.'];
        } else {
            $this->playlistRepo->addVideoToPlaylist($playlistId, $videoId);
            return ['success' => true, 'action' => 'added', 'message' => 'Video guardado en la lista.'];
        }
    }

    public function createPlaylist(int $userId, string $title, string $visibility = 'private'): array {
        $title = trim($title);
        if (empty($title)) {
            return ['success' => false, 'message' => 'El título de la lista es obligatorio.'];
        }
        
        $uuid = Utils::generateUUID();
        $playlistId = $this->playlistRepo->create($userId, $uuid, $title, null, $visibility, 'published_newest', 'custom');

        if ($playlistId) {
            return [
                'success' => true, 
                'message' => 'Lista creada exitosamente.', 
                'playlist' => [
                    'uuid' => $uuid,
                    'title' => $title,
                    'visibility' => $visibility,
                    'has_video' => 0 
                ]
            ];
        }
        return ['success' => false, 'message' => 'Error al crear la lista de reproducción.'];
    }

    // --- NUEVO MÉTODO PARA SOLUCIONAR EL ERROR P1013 ---
    public function getAllUserPlaylists(int $userId): array {
        return $this->playlistRepo->getAllIncludingSystemByUserId($userId);
    }
}
?>