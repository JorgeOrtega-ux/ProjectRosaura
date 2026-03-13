<?php
// api/services/SearchServices.php

namespace ProjectRosaura\Services;

use MeiliSearch\Client;
use App\Core\Container;
use Exception;
use App\Api\Services\HistoryServices; // <- AÑADIDO

class SearchServices {
    private Client $client;
    private $historyService; // <- AÑADIDO

    public function __construct(?Container $container = null) {
        $meiliHost = $_ENV['MEILISEARCH_HOST'] ?? 'http://127.0.0.1:7700';
        $meiliKey = $_ENV['MEILISEARCH_MASTER_KEY'] ?? ''; 
        
        $this->client = new Client($meiliHost, $meiliKey);
        $this->historyService = new HistoryServices(); // <- AÑADIDO
    }

    public function performSearch(string $query): array {
        try {
            // --- AÑADIDO: Registrar en el historial si el usuario está logueado ---
            if (isset($_SESSION['user_id'])) {
                $this->historyService->logSearchEvent($_SESSION['user_id'], $query);
            }
            // -------------------------------------------------------------------

            $videoIndex = $this->client->index('videos');
            $channelIndex = $this->client->index('channels');

            $videoResults = $videoIndex->search($query, [
                'limit' => 24
            ]);
            
            $channelResults = $channelIndex->search($query, [
                'limit' => 5
            ]);

            return [
                'videos' => $videoResults->getHits(),
                'channels' => $channelResults->getHits()
            ];
        } catch (Exception $e) {
            error_log("Meilisearch Error: " . $e->getMessage());
            throw new Exception("Error de Meilisearch: " . $e->getMessage());
        }
    }
}
?>