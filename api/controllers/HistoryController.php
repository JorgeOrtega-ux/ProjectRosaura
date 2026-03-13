<?php
// api/controllers/HistoryController.php

namespace App\Api\Controllers;

use App\Core\Container;
use App\Core\Interfaces\HistoryRepositoryInterface;

class HistoryController {
    private $historyRepo;

    public function __construct() {
        $container = Container::getInstance();
        $this->historyRepo = $container->get(HistoryRepositoryInterface::class);
    }

    private function getUserId() {
        return $_SESSION['user_id'] ?? null;
    }

    public function get_watch_history($data = []) {
        $userId = $this->getUserId();
        if (!$userId) return ['success' => false, 'message' => 'No autorizado', 'code' => 401];

        // Leer 'page' del arreglo $data inyectado por el framework
        $page = isset($data['page']) ? (int)$data['page'] : 1;
        $limit = 20;
        $offset = ($page - 1) * $limit;

        $history = $this->historyRepo->getWatchHistory($userId, $limit, $offset);
        return ['success' => true, 'data' => $history];
    }

    public function get_search_history($data = []) {
        $userId = $this->getUserId();
        if (!$userId) return ['success' => false, 'message' => 'No autorizado', 'code' => 401];

        // Leer 'page' del arreglo $data inyectado por el framework
        $page = isset($data['page']) ? (int)$data['page'] : 1;
        $limit = 20;
        $offset = ($page - 1) * $limit;

        $history = $this->historyRepo->getSearchHistory($userId, $limit, $offset);
        return ['success' => true, 'data' => $history];
    }

    public function clear_watch_history() {
        $userId = $this->getUserId();
        if (!$userId) return ['success' => false, 'message' => 'No autorizado', 'code' => 401];

        $success = $this->historyRepo->clearWatchHistory($userId);
        return ['success' => $success, 'message' => $success ? 'Historial borrado' : 'Error al borrar'];
    }

    public function clear_search_history() {
        $userId = $this->getUserId();
        if (!$userId) return ['success' => false, 'message' => 'No autorizado', 'code' => 401];

        $success = $this->historyRepo->clearSearchHistory($userId);
        return ['success' => $success, 'message' => $success ? 'Historial borrado' : 'Error al borrar'];
    }

    public function remove_watch_item($data = []) {
        $userId = $this->getUserId();
        if (!$userId) return ['success' => false, 'message' => 'No autorizado', 'code' => 401];

        $videoId = $data['video_id'] ?? null;
        if (!$videoId) return ['success' => false, 'message' => 'ID de video requerido'];

        $success = $this->historyRepo->removeWatchItem($userId, $videoId);
        return ['success' => $success];
    }

    public function remove_search_item($data = []) {
        $userId = $this->getUserId();
        if (!$userId) return ['success' => false, 'message' => 'No autorizado', 'code' => 401];

        $searchId = $data['search_id'] ?? null;
        if (!$searchId) return ['success' => false, 'message' => 'ID de búsqueda requerido'];

        $success = $this->historyRepo->removeSearchItem($userId, $searchId);
        return ['success' => $success];
    }
}
?>