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
            $type = trim($input['type'] ?? $_GET['type'] ?? 'all');
            $isAutocomplete = !empty($input['autocomplete'] ?? $_GET['autocomplete'] ?? false);
            
            if (empty($query)) {
                return $this->respond([
                    'success'      => true,
                    'data'         => [],
                    'users'        => [],
                    'publications' => [],
                    'total'        => 0,
                    'page'         => $page,
                    'per_page'     => $limit,
                    'has_more'     => false
                ]);
            }

            $currentUserId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            
            if ($isAutocomplete) {
                $autoLimit = min(20, max(1, (int)($input['limit'] ?? $_GET['limit'] ?? 8)));
                $autoRes = $this->searchServices->searchAutocomplete($query, $currentUserId, $type, $autoLimit);
                return $this->respond([
                    'success'            => true,
                    'data'               => $autoRes['canvases'] ?? [],
                    'users'              => $autoRes['users'] ?? [],
                    'publications'       => $autoRes['publications'] ?? [],
                    'total'              => $autoRes['total'] ?? 0,
                    'total_users'        => count($autoRes['users'] ?? []),
                    'total_canvases'     => count($autoRes['canvases'] ?? []),
                    'total_publications' => count($autoRes['publications'] ?? []),
                    'page'               => 1,
                    'per_page'           => $autoLimit,
                    'has_more'           => false
                ]);
            }

            $results = $this->searchServices->searchCanvases($query, $currentUserId, $page, $limit);
            $users = ($page === 1) ? $this->searchServices->searchUsers($query, $currentUserId, 8) : [];
            $pubsRes = ($page === 1) ? $this->searchServices->searchPublications($query, $currentUserId, 1, 8) : ['publications' => [], 'total' => 0];
            
            return $this->respond([
                'success'            => true,
                'data'               => $results['canvases'],
                'users'              => $users,
                'publications'       => $pubsRes['publications'] ?? [],
                'total'              => $results['total'],
                'total_users'        => count($users),
                'total_publications' => $pubsRes['total'] ?? count($pubsRes['publications'] ?? []),
                'page'               => $results['page'],
                'per_page'           => $results['per_page'],
                'has_more'           => $results['has_more']
            ]);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>