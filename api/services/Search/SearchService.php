<?php

namespace App\Api\Services\Search;

use App\Config\Search\TypesenseManager;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;
use Exception;

class SearchService {
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

                if (!empty($canvases)) {
                    return [
                        'canvases' => array_values($canvases),
                        'total'    => count($canvases),
                        'page'     => $page,
                        'per_page' => $limit,
                        'has_more' => ($page * $limit) < $totalFound
                    ];
                }
            }
        } catch (\Throwable $e) {
            Logger::warning("Typesense search failed, falling back to SQL: " . $e->getMessage());
        }

        return $this->searchCanvasesSqlFallback($query, $currentUserId, $page, $limit);
    }

    private function searchCanvasesSqlFallback(string $query, ?int $currentUserId, int $page, int $limit): array {
        try {
            $matchedOwnerIds = [];
            try {
                $dbIdentity = $this->dbManager->getConnection(DB::CONN_IDENTITY);
                $cleanUserQuery = ltrim(trim($query), '@');
                $userPat = '%' . $cleanUserQuery . '%';
                $uStmt = $dbIdentity->prepare("SELECT id FROM " . DB::TBL_USERS . " WHERE (username LIKE ? OR identifier LIKE ?) AND deletion_scheduled_at IS NULL LIMIT 20");
                $uStmt->execute([$userPat, $userPat]);
                $matchedOwnerIds = $uStmt->fetchAll(PDO::FETCH_COLUMN);
            } catch (\Throwable $e) {
                Logger::error("Error finding matching owners: " . $e->getMessage());
            }

            $db = $this->dbManager->getConnection(DB::CONN_CANVASES);
            $offset = ($page - 1) * $limit;
            $searchPattern = '%' . $query . '%';

            $matchParts = ["(c.name LIKE :search_name)", "(c.tags LIKE :search_tags)"];
            if (!empty($matchedOwnerIds)) {
                $ownerList = implode(',', array_map('intval', $matchedOwnerIds));
                $matchParts[] = "(c.owner_id IN ($ownerList))";
            }
            $matchSql = "(" . implode(" OR ", $matchParts) . ")";

            $privacyWhere = "(c.privacy = 'public' AND c.deleted_at IS NULL)";
            if ($currentUserId) {
                $privacyWhere = "((c.privacy = 'public' OR c.owner_id = :curr_owner_id) AND c.deleted_at IS NULL)";
            }

            $countSql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " c WHERE $matchSql AND $privacyWhere";
            $countStmt = $db->prepare($countSql);
            $countStmt->bindValue(':search_name', $searchPattern, PDO::PARAM_STR);
            $countStmt->bindValue(':search_tags', $searchPattern, PDO::PARAM_STR);
            if ($currentUserId) {
                $countStmt->bindValue(':curr_owner_id', $currentUserId, PDO::PARAM_INT);
            }
            $countStmt->execute();
            $totalFound = (int)$countStmt->fetchColumn();

            $userIdParam = $currentUserId ?? 0;
            $joinMemberSql = "";
            $isMemberSelect = "0 as is_member";
            if ($currentUserId) {
                $joinMemberSql = "LEFT JOIN (SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_MEMBERS . " UNION SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_USER_ROLES . ") cm ON c.id = cm.canvas_id AND cm.user_id = :member_user_id";
                $isMemberSelect = "CASE WHEN cm.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member";
            }

            $sql = "SELECT c.id, c.uuid, c.name, c.owner_id, c.privacy, c.mode, c.is_online_active, c.favorites_count, c.members_count,
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                           $isMemberSelect
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :fav_user_id
                    $joinMemberSql
                    WHERE $matchSql AND $privacyWhere
                    ORDER BY c.favorites_count DESC, c.id DESC
                    LIMIT :limit_val OFFSET :offset_val";

            $stmt = $db->prepare($sql);
            $stmt->bindValue(':search_name', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':search_tags', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':fav_user_id', $userIdParam, PDO::PARAM_INT);
            if ($currentUserId) {
                $stmt->bindValue(':curr_owner_id', $currentUserId, PDO::PARAM_INT);
                $stmt->bindValue(':member_user_id', $userIdParam, PDO::PARAM_INT);
            }
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
                    'mode'            => $row['mode'] ?? 'offline',
                    'is_online_active'=> !empty($row['is_online_active']),
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

            $sql = "SELECT c.id, c.mode, c.is_online_active, c.favorites_count, c.members_count, c.deleted_at,
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
            
            $validIds = [];
            foreach ($rows as $row) {
                $id = (int)$row['id'];
                if (!empty($row['deleted_at'])) {
                    unset($canvases[$id]);
                    continue;
                }
                $validIds[$id] = true;
                if (isset($canvases[$id])) {
                    $canvases[$id]['mode'] = $row['mode'] ?? 'offline';
                    $canvases[$id]['is_online_active'] = !empty($row['is_online_active']);
                    $canvases[$id]['favorites_count'] = (int)$row['favorites_count'];
                    $canvases[$id]['members_count'] = (int)$row['members_count'];
                    $canvases[$id]['is_favorite'] = (bool)$row['is_favorite'];
                    $canvases[$id]['is_member'] = isset($row['is_member']) ? (bool)$row['is_member'] : false;
                }
            }

            foreach (array_keys($canvases) as $cid) {
                if (!isset($validIds[$cid])) {
                    unset($canvases[$cid]);
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
                        if ($rawCounts[$idx] !== false && isset($canvases[$cId])) {
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

    public function searchUsers(string $query, ?int $currentUserId, int $limit = 10): array {
        $cleanQuery = ltrim(trim($query), '@');
        if (empty($cleanQuery)) return [];

        try {
            $db = $this->dbManager->getConnection(DB::CONN_IDENTITY);
            $searchPattern = '%' . $cleanQuery . '%';
            $viewerParam = $currentUserId ?? 0;

            $sql = "SELECT u.id, u.uuid, u.username, u.identifier, u.profile_picture, u.banner_picture, u.bio, u.subscription_tier, u.created_at,
                           (SELECT r.name FROM " . DB::TBL_USER_ROLES . " ur JOIN " . DB::TBL_ROLES . " r ON ur.role_id = r.id WHERE ur.user_id = u.id ORDER BY r.id DESC LIMIT 1) as role_name,
                           (SELECT COUNT(*) FROM " . DB::TBL_USER_FOLLOWS . " vf WHERE vf.follower_id = :viewer_id AND vf.following_id = u.id) as is_following,
                           (SELECT COUNT(*) FROM " . DB::TBL_USER_FOLLOWS . " fcnt WHERE fcnt.following_id = u.id) as followers_count,
                           CASE 
                               WHEN u.identifier = :exact_query_i THEN 1
                               WHEN u.username = :exact_query_u THEN 2
                               WHEN u.identifier LIKE :starts_query_i THEN 3
                               WHEN u.username LIKE :starts_query_u THEN 4
                               ELSE 5
                           END as relevance_rank
                    FROM " . DB::TBL_USERS . " u
                    WHERE (u.username LIKE :search_query_u OR u.identifier LIKE :search_query_i) 
                      AND u.deletion_scheduled_at IS NULL
                    ORDER BY relevance_rank ASC, followers_count DESC, u.id DESC
                    LIMIT :limit_val";

            $stmt = $db->prepare($sql);
            $stmt->bindValue(':exact_query_i', $cleanQuery, PDO::PARAM_STR);
            $stmt->bindValue(':exact_query_u', $cleanQuery, PDO::PARAM_STR);
            $stmt->bindValue(':starts_query_i', $cleanQuery . '%', PDO::PARAM_STR);
            $stmt->bindValue(':starts_query_u', $cleanQuery . '%', PDO::PARAM_STR);
            $stmt->bindValue(':search_query_u', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':search_query_i', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':viewer_id', $viewerParam, PDO::PARAM_INT);
            $stmt->bindValue(':limit_val', $limit, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $users = [];
            foreach ($rows as $r) {
                $identifier = !empty($r['identifier']) ? $r['identifier'] : strtolower(str_replace(' ', '_', $r['username']));
                $users[] = [
                    'id' => (int)$r['id'],
                    'uuid' => $r['uuid'],
                    'username' => $r['username'],
                    'identifier' => $identifier,
                    'handle' => '@' . $identifier,
                    'avatar_url' => \App\Core\Helpers\Utils::getS3PublicUrl($r['profile_picture']),
                    'banner_url' => !empty($r['banner_picture']) ? \App\Core\Helpers\Utils::getS3PublicUrl($r['banner_picture']) : \App\Core\Helpers\Utils::getDefaultBannerForUser((int)$r['id']),
                    'bio' => $r['bio'] ?? '',
                    'subscription_tier' => (int)($r['subscription_tier'] ?? 0),
                    'role_name' => $r['role_name'] ?? 'User',
                    'followers_count' => (int)($r['followers_count'] ?? 0),
                    'is_following' => !empty($r['is_following']),
                    'is_self' => $currentUserId !== null && (int)$currentUserId === (int)$r['id']
                ];
            }
            return $users;
        } catch (\Throwable $e) {
            Logger::error("Error searching users in DB: " . $e->getMessage());
            return [];
        }
    }
}
?>