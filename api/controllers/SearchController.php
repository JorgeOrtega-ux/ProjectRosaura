<?php

namespace ProjectRosaura\Controllers;

require_once __DIR__ . '/../services/SearchServices.php';

use ProjectRosaura\Services\SearchServices;
use Exception;

class SearchController {
    private SearchServices $searchServices;

    public function __construct($container = null) {
        // En tu arquitectura, el contenedor inyecta las dependencias. 
        // Pasamos el contenedor al servicio para que pueda acceder a la configuración (host, keys).
        $this->searchServices = new SearchServices($container);
    }

    /**
     * Maneja la ruta GET /api/search
     */
    public function search(): void {
        header('Content-Type: application/json');
        
        $query = isset($_GET['q']) ? trim($_GET['q']) : '';
        
        // Si la búsqueda está vacía, retornamos arrays vacíos para evitar llamadas inútiles a Meilisearch
        if (empty($query)) {
            echo json_encode([
                'success' => true, 
                'data' => [
                    'videos' => [], 
                    'channels' => []
                ]
            ]);
            return;
        }

        try {
            $results = $this->searchServices->performSearch($query);
            echo json_encode([
                'success' => true, 
                'data' => $results
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false, 
                'message' => 'Error en el motor de búsqueda: ' . $e->getMessage()
            ]);
        }
    }
}