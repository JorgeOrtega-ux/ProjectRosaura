<?php

namespace App\Api\Services\Search;

use App\Config\Search\TypesenseManager;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;
use Exception;

class SearchServices {
    private TypesenseManager $typesenseManager;
    private DatabaseManager $dbManager;

    public function __construct(TypesenseManager $typesenseManager, DatabaseManager $dbManager) {
        $this->typesenseManager = $typesenseManager;
        $this->dbManager = $dbManager;
    }

    public function searchCanvases(string $query, ?int $currentUserId, int $page = 1, int $limit = 20): array {
        $page = max(1, $page);
        $limit = min(100, max(1, $limit));

        try {
            $client = $this->typesenseManager->getClient();
            
            if ($client) {
                if ($currentUserId) {
                    $filter = "privacy:=public || owner_id:={$currentUserId}";
                } else {
                    $filter = "privacy:=public";
                }

                $searchParameters = [
                    'q'                     => $query,
                    'query_by'              => 'name',
                    'filter_by'             => $filter,
                    'typo_tokens_threshold' => 1,
                    'num_typos'             => 2,
                    'page'                  => $page,
                    'per_page'              => $limit
                ];

                $result = $client->collections['canvases']->documents->search($searchParameters);
                $canvases = [];
                $canvasIds = [];
                $totalFound = (int)($result['found'] ?? 0);

                if (!empty($result['hits'])) {
                    foreach ($result['hits'] as $hit) {
                        $doc = $hit['document'];
                        $id = (int)$doc['id'];
                        $canvasIds[] = $id;
                        
                        $canvases[$id] = [
                            'id'           => $id, 
                            'uuid'         => $doc['uuid'],
                            'name'         => $doc['name'],
                            'owner_id'     => $doc['owner_id'] ?? null,
                            'privacy'      => $doc['privacy'],
                            'is_favorite'  => false,
                            'favorites_count' => 0,
                            'members_count'   => 0,
                            'online_players'  => 0,
                            'is_member'    => false,
                            'is_owner'     => $currentUserId !== null && $currentUserId === (int)($doc['owner_id'] ?? 0),
                            'thumbnail_url' => $this->getThumbnailUrl($doc['uuid'])
                        ];
                    }
                    
                    if (!empty($canvasIds)) {
                        $this->enrichCanvasesWithDbData($canvases, $canvasIds, $currentUserId);
                        $this->enrichCanvasesWithOnlineStatus($canvases, $canvasIds);
                    }
                }

                return [
                    'canvases' => array_values($canvases),
                    'total'    => $totalFound,
                    'page'     => $page,
                    'per_page' => $limit,
                    'has_more' => ($page * $limit) < $totalFound
                ];
            }
        } catch (\Throwable $e) {
            Logger::warning("Typesense search failed, falling back to SQL: " . $e->getMessage());
        }

        return $this->searchCanvasesSqlFallback($query, $currentUserId, $page, $limit);
    }

    private function searchCanvasesSqlFallback(string $query, ?int $currentUserId, int $page, int $limit): array {
        try {
            $db = $this->dbManager->getConnection(DB::CONN_CANVASES);
            $offset = ($page - 1) * $limit;
            $searchPattern = '%' . $query . '%';

            $privacyWhere = "c.privacy = 'public'";
            $countParams = [$searchPattern];
            if ($currentUserId) {
                $privacyWhere = "(c.privacy = 'public' OR c.owner_id = ?)";
                $countParams = [$searchPattern, $currentUserId];
            }

            $countSql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " c WHERE c.name LIKE ? AND $privacyWhere";
            $countStmt = $db->prepare($countSql);
            $countStmt->execute($countParams);
            $totalFound = (int)$countStmt->fetchColumn();

            $userIdParam = $currentUserId ?? 0;
            $joinMemberSql = "";
            $isMemberSelect = "0 as is_member";
            if ($currentUserId) {
                $joinMemberSql = "LEFT JOIN (SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_MEMBERS . " UNION SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_USER_ROLES . ") cm ON c.id = cm.canvas_id AND cm.user_id = :member_user_id";
                $isMemberSelect = "CASE WHEN cm.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member";
            }

            $sql = "SELECT c.id, c.uuid, c.name, c.owner_id, c.privacy, c.favorites_count, c.members_count,
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                           $isMemberSelect
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :fav_user_id
                    $joinMemberSql
                    WHERE c.name LIKE :search_query AND $privacyWhere
                    ORDER BY c.favorites_count DESC, c.id DESC
                    LIMIT :limit_val OFFSET :offset_val";

            $stmt = $db->prepare($sql);
            $stmt->bindValue(':fav_user_id', $userIdParam, PDO::PARAM_INT);
            if ($currentUserId) {
                $stmt->bindValue(':member_user_id', $userIdParam, PDO::PARAM_INT);
            }
            $stmt->bindValue(':search_query', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':limit_val', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset_val', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $canvases = [];
            $canvasIds = [];

            foreach ($rows as $row) {
                $id = (int)$row['id'];
                $canvasIds[] = $id;
                $canvases[$id] = [
                    'id'              => $id,
                    'uuid'            => $row['uuid'],
                    'name'            => $row['name'],
                    'owner_id'        => $row['owner_id'] !== null ? (int)$row['owner_id'] : null,
                    'privacy'         => $row['privacy'],
                    'is_favorite'     => (bool)$row['is_favorite'],
                    'favorites_count' => (int)$row['favorites_count'],
                    'members_count'   => (int)$row['members_count'],
                    'online_players'  => 0,
                    'is_member'       => (bool)$row['is_member'],
                    'is_owner'        => $currentUserId !== null && $currentUserId === (int)($row['owner_id'] ?? 0),
                    'thumbnail_url'   => $this->getThumbnailUrl($row['uuid'])
                ];
            }

            if (!empty($canvasIds)) {
                $this->enrichCanvasesWithOnlineStatus($canvases, $canvasIds);
            }

            return [
                'canvases' => array_values($canvases),
                'total'    => $totalFound,
                'page'     => $page,
                'per_page' => $limit,
                'has_more' => ($page * $limit) < $totalFound
            ];
        } catch (\Throwable $e) {
            Logger::error("Error in search SQL fallback: " . $e->getMessage());
            return [
                'canvases' => [],
                'total'    => 0,
                'page'     => $page,
                'per_page' => $limit,
                'has_more' => false
            ];
        }
    }
    
    private function enrichCanvasesWithDbData(array &$canvases, array $canvasIds, ?int $currentUserId): void {
        try {
            $db = $this->dbManager->getConnection(DB::CONN_CANVASES);
            $inQuery = implode(',', array_fill(0, count($canvasIds), '?'));
            
            $userIdParam = $currentUserId ?? 0;
            
            $joinMemberSql = "";
            $isMemberSelect = "0 as is_member";
            if ($currentUserId) {
                $joinMemberSql = "LEFT JOIN (SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_MEMBERS . " UNION SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_USER_ROLES . ") cm ON c.id = cm.canvas_id AND cm.user_id = ?";
                $isMemberSelect = "CASE WHEN cm.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member";
            }

            $sql = "SELECT c.id, c.favorites_count, c.members_count, 
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                           $isMemberSelect
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = ?
                    $joinMemberSql
                    WHERE c.id IN ($inQuery)";
                    
            $stmt = $db->prepare($sql);
            
            $params = [$userIdParam];
            if ($currentUserId) {
                $params[] = $userIdParam;
            }
            foreach ($canvasIds as $id) {
                $params[] = $id;
            }
            
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($rows as $row) {
                $id = (int)$row['id'];
                if (isset($canvases[$id])) {
                    $canvases[$id]['favorites_count'] = (int)$row['favorites_count'];
                    $canvases[$id]['members_count'] = (int)$row['members_count'];
                    $canvases[$id]['is_favorite'] = (bool)$row['is_favorite'];
                    $canvases[$id]['is_member'] = isset($row['is_member']) ? (bool)$row['is_member'] : false;
                }
            }
        } catch (\Exception $e) {
            Logger::error("Error enriching search canvases from DB: " . $e->getMessage());
        }
    }
    
    private function enrichCanvasesWithOnlineStatus(array &$canvases, array $canvasIds): void {
        try {
            if (class_exists(RedisCache::class)) {
                $redis = (new RedisCache())->getClient();
                if ($redis) {
                    $rawCounts = $redis->hmGet("canvas:online_counts", $canvasIds);
                    foreach ($canvasIds as $idx => $cId) {
                        if ($rawCounts[$idx] !== false) {
                            $canvases[$cId]['online_players'] = (int)$rawCounts[$idx];
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Logger::error("Error enriching search canvases from Redis: " . $e->getMessage());
        }
    }
    
    private function getThumbnailUrl(string $uuid): ?string {
        return \App\Core\Helpers\Utils::getS3PublicUrl("thumbnails/canvas_" . $uuid . ".webp");
    }
}
?>