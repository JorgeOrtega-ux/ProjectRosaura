<?php
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
            $query = $input['q'] ?? $_GET['q'] ?? '';
            
            if (empty(trim($query))) {
                return $this->respond(['success' => true, 'data' => []]);
            }

            $currentUserId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            
            $results = $this->searchServices->searchCanvases($query, $currentUserId);
            
            return $this->respond(['success' => true, 'data' => $results]);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>