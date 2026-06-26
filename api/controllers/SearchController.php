<?php
// api/controllers/SearchController.php

namespace App\Api\Controllers;

use App\Api\Services\SearchServices;
use App\Core\System\Logger;
use App\Core\Interfaces\SessionManagerInterface;
use Exception;

class SearchController extends BaseController {
    private SearchServices $searchServices;
    private Logger $logger;
    private SessionManagerInterface $session;

    public function __construct(SearchServices $searchServices, Logger $logger, SessionManagerInterface $session) {
        $this->searchServices = $searchServices;
        $this->logger = $logger;
        $this->session = $session;
    }

    public function search(): void {
        try {
            $query = $_GET['q'] ?? '';
            
            if (empty(trim($query))) {
                $this->jsonResponse(['success' => true, 'data' => []]);
                return;
            }

            // Validar de forma segura si existe una sesión activa para los filtros
            $currentUserId = $this->session->get('user_id'); 
            
            $results = $this->searchServices->searchCanvases($query, $currentUserId);
            
            $this->jsonResponse(['success' => true, 'data' => $results]);
        } catch (Exception $e) {
            $this->logger->error("Error en SearchController: " . $e->getMessage(), ['exception' => $e]);
            $this->jsonResponse(['success' => false, 'message' => 'Error interno al procesar la búsqueda'], 500);
        }
    }
}
?>