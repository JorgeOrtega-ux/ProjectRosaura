<?php
// api/services/PlaylistServices.php

namespace App\Api\Services;

use App\Core\Repositories\PlaylistRepository;

class PlaylistServices {
    private $playlistRepo;

    public function __construct(PlaylistRepository $playlistRepo) {
        $this->playlistRepo = $playlistRepo;
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
}
?>