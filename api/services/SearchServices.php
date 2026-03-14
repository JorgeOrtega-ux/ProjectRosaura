<?php
// api/services/SearchServices.php

namespace ProjectRosaura\Services;

use MeiliSearch\Client;
use App\Core\Container;
use Exception;
use App\Api\Services\HistoryServices;

class SearchServices {
    private Client $client;
    private $historyService;

    public function __construct(?Container $container = null) {
        $meiliHost = $_ENV['MEILISEARCH_HOST'] ?? 'http://127.0.0.1:7700';
        $meiliKey = $_ENV['MEILISEARCH_MASTER_KEY'] ?? ''; 
        
        $this->client = new Client($meiliHost, $meiliKey);
        $this->historyService = new HistoryServices();
    }

    /**
     * Realiza una búsqueda avanzada en Meilisearch utilizando filtros y ordenamientos
     */
    public function performSearch(string $query, array $filters = [], string $sort = 'created_at:desc'): array {
        try {
            if (isset($_SESSION['user_id']) && !empty($query)) {
                $this->historyService->logSearchEvent($_SESSION['user_id'], $query);
            }

            $videoIndex = $this->client->index('videos');
            $channelIndex = $this->client->index('channels');

            // Construir reglas de filtrado (Facets)
            $meiliFilters = [];
            
            if (!empty($filters['category'])) {
                $categories = is_array($filters['category']) ? $filters['category'] : explode(',', $filters['category']);
                $catFilters = array_map(fn($c) => "category = \"$c\"", $categories);
                $meiliFilters[] = "(" . implode(" OR ", $catFilters) . ")";
            }

            if (!empty($filters['tags'])) {
                $tags = is_array($filters['tags']) ? $filters['tags'] : explode(',', $filters['tags']);
                $tagFilters = array_map(fn($t) => "tags = \"$t\"", $tags);
                $meiliFilters[] = "(" . implode(" AND ", $tagFilters) . ")"; // AND para mayor especificidad en tags
            }

            if (!empty($filters['models'])) {
                $models = is_array($filters['models']) ? $filters['models'] : explode(',', $filters['models']);
                $modelFilters = array_map(fn($m) => "models = \"$m\"", $models);
                $meiliFilters[] = "(" . implode(" OR ", $modelFilters) . ")";
            }

            $searchParams = [
                'limit' => 24,
                'sort' => [$sort]
            ];

            if (!empty($meiliFilters)) {
                $searchParams['filter'] = implode(" AND ", $meiliFilters);
            }

            // Opcional: Solicitar la distribución de las facetas para pintar filtros en la UI
            // $searchParams['facets'] = ['category', 'tags', 'models'];

            $videoResults = $videoIndex->search($query, $searchParams);
            
            // Los canales no suelen tener tantos filtros complejos, hacemos búsqueda básica
            $channelResults = $channelIndex->search($query, [
                'limit' => 5
            ]);

            return [
                'videos' => $videoResults->getHits(),
                'channels' => $channelResults->getHits(),
                // 'facets' => $videoResults->getFacetDistribution() // Útil para el frontend si lo habilitas arriba
            ];
        } catch (Exception $e) {
            error_log("Meilisearch Error: " . $e->getMessage());
            throw new Exception("Error de Meilisearch: " . $e->getMessage());
        }
    }
}
?>