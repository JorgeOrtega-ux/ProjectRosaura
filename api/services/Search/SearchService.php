<?php

namespace App\Api\Services\Search;

use App\Config\Search\TypesenseManager;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\Helpers\EnvLoader;
use App\Core\Helpers\Utils;
use App\Core\System\SubscriptionPlanConstants;
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

        $apiKey = EnvLoader::get('TYPESENSE_API_KEY', '');
        if (!empty($apiKey)) {
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

            $totalFound = 0;
            // Only perform full table COUNT when pagination page > 1 or explicitly requested
            if ($page > 1) {
                $countSql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " c WHERE $matchSql AND $privacyWhere";
                $countStmt = $db->prepare($countSql);
                $countStmt->bindValue(':search_name', $searchPattern, PDO::PARAM_STR);
                $countStmt->bindValue(':search_tags', $searchPattern, PDO::PARAM_STR);
                if ($currentUserId) {
                    $countStmt->bindValue(':curr_owner_id', $currentUserId, PDO::PARAM_INT);
                }
                $countStmt->execute();
                $totalFound = (int)$countStmt->fetchColumn();
            }

            $userIdParam = $currentUserId ?? 0;

            $sql = "SELECT c.id, c.uuid, c.name, c.owner_id, c.privacy, c.mode, c.is_online_active, c.favorites_count, c.members_count,
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :fav_user_id
                    WHERE $matchSql AND $privacyWhere
                    ORDER BY c.favorites_count DESC, c.id DESC
                    LIMIT :limit_val OFFSET :offset_val";

            $stmt = $db->prepare($sql);
            $stmt->bindValue(':search_name', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':search_tags', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':fav_user_id', $userIdParam, PDO::PARAM_INT);
            if ($currentUserId) {
                $stmt->bindValue(':curr_owner_id', $currentUserId, PDO::PARAM_INT);
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
                    'is_member'       => false,
                    'is_owner'        => $currentUserId !== null && $currentUserId === (int)($row['owner_id'] ?? 0),
                    'thumbnail_url'   => $this->getThumbnailUrl($row['uuid'])
                ];
            }

            if (!empty($canvasIds)) {
                $this->enrichCanvasesWithOnlineStatus($canvases, $canvasIds);
            }

            if ($page === 1) {
                $totalFound = count($canvases);
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

            $sql = "SELECT c.id, c.mode, c.is_online_active, c.favorites_count, c.members_count, c.deleted_at,
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = ?
                    WHERE c.id IN ($inQuery)";
                    
            $stmt = $db->prepare($sql);
            $params = array_merge([$userIdParam], $canvasIds);
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
            $limitVal = min(50, max(1, $limit));

            $sql = "SELECT u.id, u.uuid, u.username, u.identifier, u.profile_picture, u.banner_picture, u.bio, u.subscription_tier, u.created_at,
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
                    ORDER BY relevance_rank ASC, u.id DESC
                    LIMIT :limit_val";

            $stmt = $db->prepare($sql);
            $stmt->bindValue(':exact_query_i', $cleanQuery, PDO::PARAM_STR);
            $stmt->bindValue(':exact_query_u', $cleanQuery, PDO::PARAM_STR);
            $stmt->bindValue(':starts_query_i', $cleanQuery . '%', PDO::PARAM_STR);
            $stmt->bindValue(':starts_query_u', $cleanQuery . '%', PDO::PARAM_STR);
            $stmt->bindValue(':search_query_u', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':search_query_i', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':limit_val', $limitVal, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (empty($rows)) return [];

            $userIds = array_column($rows, 'id');
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));

            // Batch fetch roles
            $rolesMap = [];
            $roleStmt = $db->prepare("SELECT ur.user_id, r.name FROM " . DB::TBL_USER_ROLES . " ur JOIN " . DB::TBL_ROLES . " r ON ur.role_id = r.id WHERE ur.user_id IN ({$placeholders}) ORDER BY r.id DESC");
            $roleStmt->execute($userIds);
            while ($rRow = $roleStmt->fetch(PDO::FETCH_ASSOC)) {
                if (!isset($rolesMap[$rRow['user_id']])) {
                    $rolesMap[$rRow['user_id']] = $rRow['name'];
                }
            }

            // Batch fetch followers counts
            $followersMap = [];
            $fStmt = $db->prepare("SELECT following_id, COUNT(*) as count FROM " . DB::TBL_USER_FOLLOWS . " WHERE following_id IN ({$placeholders}) GROUP BY following_id");
            $fStmt->execute($userIds);
            while ($fRow = $fStmt->fetch(PDO::FETCH_ASSOC)) {
                $followersMap[$fRow['following_id']] = (int)$fRow['count'];
            }

            // Batch fetch following status for viewer
            $followingViewerMap = [];
            if ($currentUserId) {
                $vStmt = $db->prepare("SELECT following_id FROM " . DB::TBL_USER_FOLLOWS . " WHERE follower_id = ? AND following_id IN ({$placeholders})");
                $vStmt->execute(array_merge([$currentUserId], $userIds));
                while ($vRow = $vStmt->fetch(PDO::FETCH_ASSOC)) {
                    $followingViewerMap[$vRow['following_id']] = true;
                }
            }

            $users = [];
            foreach ($rows as $r) {
                $uid = (int)$r['id'];
                $identifier = !empty($r['identifier']) ? $r['identifier'] : strtolower(str_replace(' ', '_', $r['username']));
                $tier = (int)($r['subscription_tier'] ?? 0);
                $subColor = SubscriptionPlanConstants::getTierColor($tier);
                $users[] = [
                    'id' => $uid,
                    'uuid' => $r['uuid'],
                    'username' => $r['username'],
                    'identifier' => $identifier,
                    'handle' => '@' . $identifier,
                    'avatar_url' => Utils::getS3PublicUrl($r['profile_picture']),
                    'banner_url' => !empty($r['banner_picture']) ? Utils::getS3PublicUrl($r['banner_picture']) : Utils::getDefaultBannerForUser($uid),
                    'bio' => $r['bio'] ?? '',
                    'subscription_tier' => $tier,
                    'subscription_color' => $subColor,
                    'subscription_bg' => Utils::formatSubscriptionBg($subColor),
                    'role_name' => $rolesMap[$uid] ?? 'User',
                    'followers_count' => $followersMap[$uid] ?? 0,
                    'is_following' => isset($followingViewerMap[$uid]),
                    'is_self' => $currentUserId !== null && (int)$currentUserId === $uid
                ];
            }
            return $users;
        } catch (\Throwable $e) {
            Logger::error("Error searching users in DB: " . $e->getMessage());
            return [];
        }
    }

    public function searchPublications(string $query, ?int $currentUserId, int $page = 1, int $limit = 20): array {
        $cleanQuery = trim($query);
        if (empty($cleanQuery)) {
            return [
                'publications' => [],
                'total' => 0,
                'page' => $page,
                'per_page' => $limit,
                'has_more' => false
            ];
        }

        $page = max(1, $page);
        $limit = min(100, max(1, $limit));
        $offset = ($page - 1) * $limit;

        try {
            $dbCanvases = $this->dbManager->getConnection(DB::CONN_CANVASES);
            $searchPattern = '%' . $cleanQuery . '%';

            $countSql = "SELECT COUNT(*) FROM " . DB::TBL_PUBLICATIONS . " p 
                         WHERE (p.title LIKE :search_title OR p.description LIKE :search_desc) 
                           AND p.privacy = 'public'";
            $countStmt = $dbCanvases->prepare($countSql);
            $countStmt->bindValue(':search_title', $searchPattern, PDO::PARAM_STR);
            $countStmt->bindValue(':search_desc', $searchPattern, PDO::PARAM_STR);
            $countStmt->execute();
            $totalFound = (int)$countStmt->fetchColumn();

            $sql = "SELECT p.id, p.uuid, p.user_id, p.canvas_id, p.title, p.description, p.image_path,
                           p.likes_count, p.views_count, p.comments_count, p.created_at
                    FROM " . DB::TBL_PUBLICATIONS . " p
                    WHERE (p.title LIKE :search_title OR p.description LIKE :search_desc) 
                      AND p.privacy = 'public'
                    ORDER BY p.likes_count DESC, p.id DESC
                    LIMIT :limit_val OFFSET :offset_val";

            $stmt = $dbCanvases->prepare($sql);
            $stmt->bindValue(':search_title', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':search_desc', $searchPattern, PDO::PARAM_STR);
            $stmt->bindValue(':limit_val', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset_val', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (empty($rows)) {
                return [
                    'publications' => [],
                    'total' => $totalFound,
                    'page' => $page,
                    'per_page' => $limit,
                    'has_more' => ($page * $limit) < $totalFound
                ];
            }

            // Hydrate author info
            $userIds = array_unique(array_column($rows, 'user_id'));
            $usersMap = [];
            if (!empty($userIds)) {
                $dbIdentity = $this->dbManager->getConnection(DB::CONN_IDENTITY);
                $placeholders = implode(',', array_fill(0, count($userIds), '?'));
                $uStmt = $dbIdentity->prepare("SELECT id, uuid, username, identifier, profile_picture, subscription_tier FROM " . DB::TBL_USERS . " WHERE id IN ({$placeholders})");
                $uStmt->execute(array_values($userIds));
                while ($uRow = $uStmt->fetch(PDO::FETCH_ASSOC)) {
                    $tier = (int)($uRow['subscription_tier'] ?? 0);
                    $subColor = SubscriptionPlanConstants::getTierColor($tier);
                    $uRow['subscription_color'] = $subColor;
                    $uRow['subscription_bg'] = Utils::formatSubscriptionBg($subColor);
                    $uRow['avatar_url'] = Utils::getS3PublicUrl($uRow['profile_picture']);
                    $usersMap[$uRow['id']] = $uRow;
                }
            }

            $publications = [];
            foreach ($rows as $row) {
                $author = $usersMap[$row['user_id']] ?? null;
                $authorIdentifier = $author ? ($author['identifier'] ?? strtolower(str_replace(' ', '_', $author['username']))) : 'unknown';
                $publications[] = [
                    'id' => (int)$row['id'],
                    'uuid' => $row['uuid'],
                    'title' => $row['title'],
                    'description' => $row['description'] ?? '',
                    'thumbnail_url' => Utils::getS3PublicUrl($row['image_path']),
                    'image_url' => Utils::getS3PublicUrl($row['image_path']),
                    'likes_count' => (int)$row['likes_count'],
                    'views_count' => (int)$row['views_count'],
                    'comments_count' => (int)$row['comments_count'],
                    'created_at' => $row['created_at'],
                    'author' => [
                        'id' => (int)$row['user_id'],
                        'uuid' => $author['uuid'] ?? '',
                        'username' => $author['username'] ?? __('user'),
                        'identifier' => $authorIdentifier,
                        'handle' => '@' . $authorIdentifier,
                        'avatar_url' => $author['avatar_url'] ?? Utils::getDefaultAvatarUrl('U'),
                        'subscription_tier' => (int)($author['subscription_tier'] ?? 0),
                        'subscription_color' => $author['subscription_color'] ?? null,
                        'subscription_bg' => $author['subscription_bg'] ?? null
                    ]
                ];
            }

            return [
                'publications' => $publications,
                'total' => $totalFound,
                'page' => $page,
                'per_page' => $limit,
                'has_more' => ($page * $limit) < $totalFound
            ];
        } catch (\Throwable $e) {
            Logger::error("Error searching publications in DB: " . $e->getMessage());
            return [
                'publications' => [],
                'total' => 0,
                'page' => $page,
                'per_page' => $limit,
                'has_more' => false
            ];
        }
    }

    public function searchAutocomplete(string $query, ?int $currentUserId, string $type = 'all', int $limit = 8): array {
        $cleanQuery = trim($query);
        if (empty($cleanQuery)) {
            return [
                'users' => [],
                'canvases' => [],
                'publications' => [],
                'total' => 0
            ];
        }

        $limit = min(20, max(1, $limit));
        $cacheKey = "search:auto:" . md5("{$cleanQuery}:{$type}:{$currentUserId}") . ":{$limit}";

        try {
            if (class_exists(RedisCache::class)) {
                $redis = (new RedisCache())->getClient();
                if ($redis) {
                    $cached = $redis->get($cacheKey);
                    if ($cached) {
                        $data = json_decode($cached, true);
                        if (is_array($data)) return $data;
                    }
                }
            }
        } catch (\Throwable $e) {}

        $users = [];
        $canvases = [];
        $publications = [];

        if ($type === 'all') {
            // Balanced breakdown capped at total 8 items max
            $users = $this->searchUsers($cleanQuery, $currentUserId, 3);
            $canvasesRes = $this->searchCanvasesSqlFallback($cleanQuery, $currentUserId, 1, 3);
            $canvases = $canvasesRes['canvases'] ?? [];
            $pubsRes = $this->searchPublications($cleanQuery, $currentUserId, 1, 3);
            $publications = $pubsRes['publications'] ?? [];

            $totalItems = count($users) + count($canvases) + count($publications);
            if ($totalItems > $limit) {
                $remaining = $limit;
                $users = array_slice($users, 0, min(count($users), 3));
                $remaining -= count($users);
                $canvases = array_slice($canvases, 0, min(count($canvases), min(3, $remaining)));
                $remaining -= count($canvases);
                $publications = array_slice($publications, 0, min(count($publications), $remaining));
            }
        } elseif ($type === 'users') {
            $users = $this->searchUsers($cleanQuery, $currentUserId, $limit);
        } elseif ($type === 'canvases') {
            $canvasesRes = $this->searchCanvasesSqlFallback($cleanQuery, $currentUserId, 1, $limit);
            $canvases = $canvasesRes['canvases'] ?? [];
        } elseif ($type === 'publications') {
            $pubsRes = $this->searchPublications($cleanQuery, $currentUserId, 1, $limit);
            $publications = $pubsRes['publications'] ?? [];
        }

        $result = [
            'users' => $users,
            'canvases' => $canvases,
            'publications' => $publications,
            'total' => count($users) + count($canvases) + count($publications)
        ];

        try {
            if (isset($redis) && $redis) {
                $redis->setex($cacheKey, 60, json_encode($result));
            }
        } catch (\Throwable $e) {}

        return $result;
    }
}
?>