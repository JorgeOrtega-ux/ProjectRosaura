<?php
// api/controllers/SearchController.php

namespace ProjectRosaura\Controllers;

require_once __DIR__ . '/../services/SearchServices.php';

use ProjectRosaura\Services\SearchServices;
use App\Core\System\Logger;
use App\Core\Container;
use Exception;

class SearchController {
    private SearchServices $searchServices;
    private Logger $logger;

    public function __construct(?Container $container = null) {
        $this->searchServices = new SearchServices($container);
        
        if ($container && method_exists($container, 'has') && $container->has(Logger::class)) {
            $this->logger = $container->get(Logger::class);
        } else {
            $this->logger = new Logger();
        }
    }

    /**
     * Maneja la ruta GET /api/index.php?route=search.get
     */
    public function search(array $input): array {
        $query = isset($input['q']) ? trim($input['q']) : '';
        
        // Extraer los nuevos parámetros de filtro
        $filters = [
            'category' => isset($input['category']) ? trim($input['category']) : null,
            'tags' => isset($input['tags']) ? trim($input['tags']) : null,
            'models' => isset($input['models']) ? trim($input['models']) : null,
        ];
        
        // Limpiar filtros vacíos
        $filters = array_filter($filters);

        // Soporte para ordenamiento añadido
        $sort = isset($input['sort']) ? trim($input['sort']) : 'relevant';
        
        // Validación de seguridad para sort (incluyendo los nuevos filtros)
        $allowedSorts = ['relevant', 'created_at:desc', 'created_at:asc', 'views:desc', 'views:asc', 'likes:desc', 'duration:desc'];
        if (!in_array($sort, $allowedSorts)) {
            $sort = 'relevant';
        }

        if (empty($query) && empty($filters)) {
            $this->logger->info("Petición de búsqueda vacía recibida.", ['module' => 'search']);
            return [
                'success' => true, 
                'data' => [
                    'videos' => [], 
                    'channels' => []
                ]
            ];
        }

        try {
            $this->logger->info("Motor de búsqueda consultando", [
                'query' => $query,
                'filters' => $filters,
                'sort' => $sort
            ]);
            
            $results = $this->searchServices->performSearch($query, $filters, $sort);
            
            return [
                'success' => true, 
                'data' => $results
            ];

        } catch (Exception $e) {
            $this->logger->error("Excepción crítica en Meilisearch: " . $e->getMessage(), ['query' => $query]);
            
            http_response_code(500);
            return [
                'success' => false, 
                'message' => $e->getMessage() 
            ];
        }
    }
}
?>