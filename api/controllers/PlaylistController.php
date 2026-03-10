<?php
// api/controllers/PlaylistController.php

namespace App\Api\Controllers;

use App\Api\Services\PlaylistServices;

class PlaylistController {
    private $playlistService;

    // Se inyecta el servicio mediante el contenedor (Container.php)
    public function __construct(PlaylistServices $playlistService) {
        $this->playlistService = $playlistService;
    }

    public function getDetails($input) {
        if (empty($input['id'])) {
            return ['success' => false, 'message' => 'ID de lista de reproducción no proporcionado.'];
        }

        $result = $this->playlistService->getPlaylistDetails($input['id']);
        
        if (!$result) {
            return ['success' => false, 'message' => 'Lista de reproducción no encontrada o es privada.'];
        }

        return ['success' => true, 'data' => $result];
    }
    
    // NUEVO: Método para obtener la lista estructurada para la vista de Watch
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
}
?>