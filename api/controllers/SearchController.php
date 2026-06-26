<?php
// api/controllers/SearchController.php

namespace App\Api\Controllers;

use App\Api\Services\SearchServices;
use App\Core\Interfaces\SessionManagerInterface;

class SearchController extends BaseController {
    private SearchServices $searchServices;
    private SessionManagerInterface $session;

    public function __construct(SearchServices $searchServices, SessionManagerInterface $session) {
        $this->searchServices = $searchServices;
        $this->session = $session;
    }

    public function search($input) {
        try {
            // Se extrae la query desde el $input que pasa el framework o de la superglobal
            $query = $input['q'] ?? $_GET['q'] ?? '';
            
            if (empty(trim($query))) {
                return $this->respond(['success' => true, 'data' => []]);
            }

            // Validar de forma segura la sesión usando los estándares de tu SessionManager
            $currentUserId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            
            $results = $this->searchServices->searchCanvases($query, $currentUserId);
            
            return $this->respond(['success' => true, 'data' => $results]);

        } catch (\Throwable $e) {
            // Delegar la excepción al manejador centralizado del BaseController (el cual inyecta el Logger por ti)
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>