<?php
// api/controllers/PlaylistController.php

namespace App\Api\Controllers;

use App\Api\Services\PlaylistServices;
use App\Core\Interfaces\SessionManagerInterface;

class PlaylistController {
    private $playlistService;
    private $sessionManager;

    // Se inyectan mediante el contenedor (Container.php)
    public function __construct(PlaylistServices $playlistService, SessionManagerInterface $sessionManager) {
        $this->playlistService = $playlistService;
        $this->sessionManager = $sessionManager;
    }

    public function getDetails($input) {
        if (empty($input['id'])) {
            return ['success' => false, 'message' => 'ID de lista de reproducción no proporcionado.'];
        }
        $result = $this->playlistService->getPlaylistDetails($input['id']);
        if (!$result) {
            return ['success' => false, 'message' => 'Lista de reproducción no encontrada o es privada.'];
        }
        
        // Agregar bandera isSystem para el frontend
        if (isset($result['playlist']['type'])) {
            $result['playlist']['isSystem'] = $result['playlist']['type'] !== 'custom';
        }
        
        return ['success' => true, 'data' => $result];
    }
    
    public function getQueue($input) {
        if (empty($input['playlist_uuid'])) {
            return ['success' => false, 'message' => 'El identificador de la playlist es requerido.'];
        }
        $result = $this->playlistService->getPlaylistQueueData($input['playlist_uuid']);
        if (!$result) {
            return ['success' => false, 'message' => 'No se encontró la lista de reproducción.'];
        }
        return ['success' => true, 'data' => $result];
    }

    public function getPlaylistsForVideo($input) {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => 'No autorizado.', 'code' => 401];
        }
        if (empty($input['video_id'])) {
            return ['success' => false, 'message' => 'ID de video requerido.'];
        }
        
        $userId = $this->sessionManager->get('user_id');
        $playlists = $this->playlistService->getPlaylistsForVideo($userId, (int)$input['video_id']);
        
        return ['success' => true, 'data' => $playlists];
    }

    public function toggleVideo($input) {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => 'No autorizado.', 'code' => 401];
        }
        if (empty($input['playlist_uuid']) || empty($input['video_id'])) {
            return ['success' => false, 'message' => 'Faltan parámetros.'];
        }

        $userId = $this->sessionManager->get('user_id');
        return $this->playlistService->toggleVideoInPlaylist($userId, $input['playlist_uuid'], (int)$input['video_id']);
    }

    public function createPlaylist($input) {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => 'No autorizado.', 'code' => 401];
        }
        if (empty($input['title'])) {
            return ['success' => false, 'message' => 'El título es requerido.'];
        }

        $userId = $this->sessionManager->get('user_id');
        $visibility = $input['visibility'] ?? 'private';

        return $this->playlistService->createPlaylist($userId, $input['title'], $visibility);
    }
    
    // --- NUEVO MÉTODO PARA FEED DE PLAYLISTS ---
    public function getAllPlaylists($input) {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => 'No autorizado.', 'code' => 401];
        }
        
        $userId = $this->sessionManager->get('user_id');
        
        try {
            $playlists = $this->playlistService->getAllUserPlaylists($userId); 
            
            // Inyectamos la bandera isSystem para el frontend
            foreach ($playlists as &$playlist) {
                $playlist['isSystem'] = isset($playlist['type']) && $playlist['type'] !== 'custom';
            }
            
            return ['success' => true, 'data' => $playlists];
        } catch (\Exception $e) {
             return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}
?>