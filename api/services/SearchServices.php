<?php

namespace ProjectRosaura\Services;

use MeiliSearch\Client;
use App\Core\Container;
use Exception;

class SearchServices {
    private Client $client;

    public function __construct(?Container $container = null) {
        // Idealmente, estas credenciales vienen de tu $container->get('config') o variables de entorno
        $meiliHost = getenv('MEILISEARCH_HOST') ?: 'http://127.0.0.1:7700';
        $meiliKey = getenv('MEILISEARCH_MASTER_KEY') ?: 'TU_MASTER_KEY_AQUI'; 
        
        $this->client = new Client($meiliHost, $meiliKey);
    }

    /**
     * Realiza una búsqueda federada en los índices de videos y canales
     */
    public function performSearch(string $query): array {
        try {
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
            // CORRECCIÓN: Devolvemos el mensaje EXACTO de Meilisearch para diagnosticar
            throw new Exception("Error de Meilisearch: " . $e->getMessage());
        }
    }
}