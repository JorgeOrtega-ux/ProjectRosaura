<?php

namespace ProjectRosaura\Controllers;

require_once __DIR__ . '/../services/SearchServices.php';

use ProjectRosaura\Services\SearchServices;
use App\Core\System\Logger;
use App\Core\Container; // <--- Agregamos la importación de tu clase Container
use Exception;

class SearchController {
    private SearchServices $searchServices;
    private Logger $logger;

    // Le decimos a PHP estrictamente qué tipo de dato es $container
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
        
        if (empty($query)) {
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
            $this->logger->info("Motor de búsqueda consultando", ['query' => $query]);
            
            $results = $this->searchServices->performSearch($query);
            
            return [
                'success' => true, 
                'data' => $results
            ];

        } catch (Exception $e) {
            $this->logger->error("Excepción crítica en Meilisearch: " . $e->getMessage(), ['query' => $query]);
            
            http_response_code(500);
            return [
                'success' => false, 
                'message' => 'Error interno en el motor de búsqueda.'
            ];
        }
    }
}