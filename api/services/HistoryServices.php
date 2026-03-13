<?php
// api/services/HistoryServices.php

namespace App\Api\Services;

use App\Core\Container;
use Predis\Client;

class HistoryServices {
    private $redis;

    public function __construct() {
        $container = Container::getInstance();
        $this->redis = $container->get(Client::class);
    }

    /**
     * Encola una visualización de video en Redis
     */
    public function logWatchEvent($userId, $videoId) {
        if (!$userId || !$videoId) return;
        
        $event = json_encode([
            'user_id' => $userId,
            'video_id' => $videoId,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        $this->redis->rpush('queue:history:watch', $event);
    }

    /**
     * Encola una búsqueda en Redis
     */
    public function logSearchEvent($userId, $query) {
        if (!$userId || empty(trim($query))) return;
        
        $event = json_encode([
            'user_id' => $userId,
            'query' => trim($query),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        $this->redis->rpush('queue:history:search', $event);
    }
}
?>