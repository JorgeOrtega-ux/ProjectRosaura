<?php
namespace App\Api\Controllers\Search;

use App\Api\Controllers\BaseController;

use App\Api\Services\Search\SearchService;
use App\Core\Interfaces\SessionManagerInterface;

class SearchController extends BaseController {
    private SearchService $searchServices;
    private SessionManagerInterface $session;

    public function __construct(SearchService $searchServices, SessionManagerInterface $session) {
        $this->searchServices = $searchServices;
        $this->session = $session;
    }

    public function search($input) {
        try {
            $query = trim($input['q'] ?? $_GET['q'] ?? '');
            $page = max(1, (int)($input['page'] ?? $_GET['page'] ?? 1));
            $limit = min(100, max(1, (int)($input['limit'] ?? $_GET['limit'] ?? 20)));
            
            if (empty($query)) {
                return $this->respond([
                    'success'  => true,
                    'data'     => [],
                    'total'    => 0,
                    'page'     => $page,
                    'per_page' => $limit,
                    'has_more' => false
                ]);
            }

            $currentUserId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            
            $results = $this->searchServices->searchCanvases($query, $currentUserId, $page, $limit);
            $users = ($page === 1) ? $this->searchServices->searchUsers($query, $currentUserId, 8) : [];
            
            return $this->respond([
                'success'     => true,
                'data'        => $results['canvases'],
                'users'       => $users,
                'total'       => $results['total'],
                'total_users' => count($users),
                'page'        => $results['page'],
                'per_page'    => $results['per_page'],
                'has_more'    => $results['has_more']
            ]);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>