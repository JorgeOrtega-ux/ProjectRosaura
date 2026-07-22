<?php

namespace App\Core\Repositories;

use PDO;
use Exception;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Config\Search\TypesenseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
use App\Config\Database\RedisCache;

class CanvasRepository implements CanvasRepositoryInterface {
    private $db;
    private TypesenseManager $typesenseManager;
    private $redisCache;
    private $redisClient;
    public function __construct(DatabaseManager $databaseManager, TypesenseManager $typesenseManager, RedisCache $redisCache = null) {
        $this->db = $databaseManager->getConnection(DB::CONN_CANVASES);
        $this->typesenseManager = $typesenseManager;
        $this->redisCache = $redisCache;
        $this->redisClient = $redisCache ? $redisCache->getClient() : null;
    }

    private function invalidateCanvasCache(int $id): void {
        if ($this->redisClient) {
            $this->redisClient->del(CacheConstants::PREFIX_CANVAS_DETAIL . $id);
        }
    }

    private function appendSnapshotUrl(array $canvas): array {
        if (!isset($canvas['id'])) {
            return $canvas;
        }
        
        $thumbnailPath = "/storage/public/thumbnails/canvas_" . $canvas['id'] . ".png";
        $physicalPath = dirname(__DIR__, 3) . $thumbnailPath;
        
        if (file_exists($physicalPath)) {
            $timestamp = filemtime($physicalPath);
            $canvas['thumbnail_url'] = $thumbnailPath . "?v=" . $timestamp;
        } else {
            $canvas['thumbnail_url'] = null;
        }
        
        return $canvas;
    }

    public function create(array $canvasData): int {
        $sql = "INSERT INTO " . DB::TBL_CANVASES . " 
                (uuid, owner_id, name, privacy, requires_approval, size, palette_id, max_participants, cooldown_pixels_batch, cooldown_seconds, is_official, allow_purchases, allow_chat, tags) 
                VALUES (:uuid, :owner_id, :name, :privacy, :requires_approval, :size, :palette_id, :max_participants, :cooldown_pixels_batch, :cooldown_seconds, :is_official, :allow_purchases, :allow_chat, :tags)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':uuid'                  => $canvasData['uuid'],
            ':owner_id'              => $canvasData['owner_id'],
            ':name'                  => $canvasData['name'],
            ':privacy'               => $canvasData['privacy'],
            ':requires_approval'     => $canvasData['requires_approval'],
            ':size'                  => $canvasData['size'],
            ':palette_id'            => $canvasData['palette_id'],
            ':max_participants'      => $canvasData['max_participants'],
            ':cooldown_pixels_batch' => $canvasData['cooldown_pixels_batch'],
            ':cooldown_seconds'      => $canvasData['cooldown_seconds'],
            ':is_official'           => $canvasData['is_official'] ?? 0,
            ':allow_purchases'       => $canvasData['allow_purchases'] ?? 1,
            ':allow_chat'            => $canvasData['allow_chat'] ?? 0,
            ':tags'                  => isset($canvasData['tags']) ? json_encode($canvasData['tags']) : null
        ]);

        $id = (int)$this->db->lastInsertId();
        try {
            $client = $this->typesenseManager->getClient();
            if ($client) {
                $document = [
                    'id'         => (string)$id,
                    'uuid'       => $canvasData['uuid'],
                    'name'       => $canvasData['name'],
                    'owner_id'   => (int)$canvasData['owner_id'],
                    'privacy'    => $canvasData['privacy'],
                    'is_official'=> $canvasData['is_official'] ?? 0,
                    'created_at' => time()
                ];
                $client->collections['canvases']->documents->create($document);
            }
        } catch (Exception $e) {
            Logger::error("Typesense Create Error (Canvas ID {$id}): " . $e->getMessage());
        }

        return $id;
    }

    public function addMember(int $canvasId, int $userId, int $roleId = 1): bool {
        try {
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("INSERT IGNORE INTO " . DB::TBL_CANVAS_MEMBERS . " (canvas_id, user_id) VALUES (:cid, :uid)");
            $stmt->execute([':cid' => $canvasId, ':uid' => $userId]);
            
            if ($stmt->rowCount() > 0) {
                $stmtUpdate = $this->db->prepare("UPDATE " . DB::TBL_CANVASES . " SET members_count = members_count + 1 WHERE id = :cid");
                $stmtUpdate->execute([':cid' => $canvasId]);
                $this->invalidateCanvasCache($canvasId);
            }
            
            $this->assignMemberRole($canvasId, $userId, $roleId);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Logger::error("addMember Error: " . $e->getMessage());
            return false;
        }
    }

    public function getPublicCanvases(int $limit = 20, ?int $currentUserId = null, string $sort = 'newest', int $offset = 0): array {
        $cacheKey = null;
        if ($this->redisClient && $currentUserId === null) {
            $cacheKey = CacheConstants::PREFIX_CANVAS_PUBLIC_PAGE . "{$sort}:{$limit}:{$offset}";
            $cached = $this->redisClient->get($cacheKey);
            if ($cached) {
                return json_decode($cached, true);
            }
        }

        $fetchClosure = function() use ($limit, $currentUserId, $sort, $offset) {
            $orderClause = "ORDER BY c.created_at DESC, c.id DESC";
            if ($sort === 'oldest') {
                $orderClause = "ORDER BY c.created_at ASC, c.id ASC";
            } elseif ($sort === 'members') {
                $orderClause = "ORDER BY c.members_count DESC, c.created_at DESC, c.id DESC";
            }

            $joinMemberSql = "";
            $isMemberSelect = "0 as is_member";
            if ($currentUserId) {
                $joinMemberSql = "LEFT JOIN " . DB::TBL_CANVAS_MEMBERS . " cm ON c.id = cm.canvas_id AND cm.user_id = :current_user_id_member";
                $isMemberSelect = "CASE WHEN cm.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member";
            }

            $sql = "SELECT c.id, c.uuid, c.name, c.owner_id, c.is_official, c.favorites_count,
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                           c.members_count,
                           $isMemberSelect
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :current_user_id
                    $joinMemberSql
                    WHERE c.privacy = 'public' AND c.is_official = 0 AND c.is_locked = 0
                    $orderClause 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':current_user_id', $currentUserId ?? 0, PDO::PARAM_INT);
            if ($currentUserId) {
                $stmt->bindValue(':current_user_id_member', $currentUserId, PDO::PARAM_INT);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            
            $results = array_map(function($canvas) {
                $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
                return $canvas;
            }, $results);

            return array_map([$this, 'appendSnapshotUrl'], $results);
        };

        if ($cacheKey && $this->redisCache) {
            return $this->redisCache->executeWithLock("lock_public_canvases_{$sort}_{$limit}_{$offset}", 5, function() use ($cacheKey, $fetchClosure) {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached) return json_decode($cached, true);
                
                $results = $fetchClosure();
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($results));
                return $results;
            });
        }

        return $fetchClosure();
    }

    public function getHomeFeed(?int $userId, string $tagFilter = 'all', int $limit = 20, int $offset = 0): array {
        $params = [];
        $whereConditions = [];
        
        if ($tagFilter !== 'all') {
            $whereConditions[] = "JSON_CONTAINS(c.tags, :tag)";
            $params[':tag'] = json_encode($tagFilter);
        }
        
        $userIdParam = $userId ?? 0;
        
        $joinMemberSql = "";
        if ($userId) {
            $whereConditions[] = "((c.is_locked = 0 AND (c.privacy = 'public' OR cm_feed.canvas_id IS NOT NULL)) OR c.owner_id = :current_user_id_w1)";
            $params[':current_user_id_w1'] = $userIdParam;
            $joinMemberSql = "LEFT JOIN " . DB::TBL_CANVAS_MEMBERS . " cm_feed ON c.id = cm_feed.canvas_id AND cm_feed.user_id = :current_user_id_member";
            $params[':current_user_id_member'] = $userIdParam;
        } else {
            $whereConditions[] = "c.is_locked = 0 AND (c.privacy = 'public' OR c.is_official = 1)";
        }
        
        $whereSql = implode(' AND ', $whereConditions);

        $isMemberSelect = $userId ? "CASE WHEN cm_feed.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member" : "0 as is_member";

        $orderSql = "ORDER BY c.is_official DESC, c.created_at DESC, c.id DESC";
        
        $sql = "SELECT c.id, c.uuid, c.name, c.owner_id, c.is_official, c.favorites_count, c.tags, c.is_locked, c.locked_reasons,
                       CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                       c.members_count,
                       $isMemberSelect
                FROM " . DB::TBL_CANVASES . " c
                LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :current_user_id_fav
                $joinMemberSql
                WHERE $whereSql
                $orderSql
                LIMIT :limit OFFSET :offset";
                
        $params[':current_user_id_fav'] = $userIdParam;
        $params[':limit'] = $limit;
        $params[':offset'] = $offset;
        
        $stmt = $this->db->prepare($sql);
        
        foreach ($params as $key => $val) {
            $type = is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($key, $val, $type);
        }
        
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        $results = array_map(function($canvas) {
            $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
            if (!empty($canvas['tags'])) {
                $canvas['tags'] = json_decode($canvas['tags'], true);
            } else {
                $canvas['tags'] = [];
            }
            return $canvas;
        }, $results);

        return array_map([$this, 'appendSnapshotUrl'], $results);
    }

    public function getOfficialCanvases(?int $currentUserId = null, string $sort = 'newest', int $limit = 50, int $offset = 0): array {
        $cacheKey = null;
        if ($this->redisClient && $currentUserId === null) {
            $cacheKey = CacheConstants::PREFIX_CANVAS_OFFICIAL_PAGE . "{$sort}:{$limit}:{$offset}";
            $cached = $this->redisClient->get($cacheKey);
            if ($cached) {
                return json_decode($cached, true);
            }
        }

        $fetchClosure = function() use ($limit, $currentUserId, $sort, $offset) {
            $orderClause = "ORDER BY c.created_at DESC, c.id DESC";
            if ($sort === 'oldest') {
                $orderClause = "ORDER BY c.created_at ASC, c.id ASC";
            } elseif ($sort === 'members') {
                $orderClause = "ORDER BY c.members_count DESC, c.created_at DESC, c.id DESC";
            }

            $joinMemberSql = "";
            $isMemberSelect = "0 as is_member";
            if ($currentUserId) {
                $joinMemberSql = "LEFT JOIN " . DB::TBL_CANVAS_MEMBERS . " cm ON c.id = cm.canvas_id AND cm.user_id = :current_user_id_member";
                $isMemberSelect = "CASE WHEN cm.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member";
            }

            $sql = "SELECT c.id, c.uuid, c.name, c.size, c.palette_id, c.is_official, c.favorites_count,
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                           c.members_count,
                           $isMemberSelect
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :current_user_id
                    $joinMemberSql
                    WHERE c.is_official = 1 AND c.is_locked = 0
                    $orderClause
                    LIMIT :limit OFFSET :offset";
                    
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':current_user_id', $currentUserId ?? 0, PDO::PARAM_INT);
            if ($currentUserId) {
                $stmt->bindValue(':current_user_id_member', $currentUserId, PDO::PARAM_INT);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            
            $results = array_map(function($canvas) {
                $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
                return $canvas;
            }, $results);

            return array_map([$this, 'appendSnapshotUrl'], $results);
        };

        if ($cacheKey && $this->redisCache) {
            return $this->redisCache->executeWithLock("lock_official_canvases_{$sort}_{$limit}_{$offset}", 5, function() use ($cacheKey, $fetchClosure) {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached) return json_decode($cached, true);
                
                $results = $fetchClosure();
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($results));
                return $results;
            });
        }

        return $fetchClosure();
    }

    public function getUserAndJoinedCanvases(int $userId, int $limit = 50, string $filter = 'all', int $offset = 0): array {
        $joinRolesSql = "LEFT JOIN " . DB::TBL_CANVAS_MEMBERS . " cm2 ON c.id = cm2.canvas_id AND cm2.user_id = :uid4";
        
        $whereClause = "WHERE (c.owner_id = :uid3 OR cm2.canvas_id IS NOT NULL)";
        if ($filter === 'mine') {
            $whereClause = "WHERE c.owner_id = :uid3";
        } elseif ($filter === 'joined') {
            $whereClause = "WHERE c.owner_id != :uid3 AND cm2.canvas_id IS NOT NULL";
        } elseif ($filter === 'favorites') {
            $whereClause = "WHERE (c.owner_id = :uid3 OR cm2.canvas_id IS NOT NULL) AND f.canvas_id IS NOT NULL";
        }

        $sql = "SELECT c.id, c.uuid, c.name, c.privacy, c.requires_approval, c.size, c.palette_id, c.max_participants, c.cooldown_pixels_batch, c.cooldown_seconds, c.created_at, c.is_official, c.owner_id, c.is_locked, c.locked_reasons, c.favorites_count,
                       CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                       c.members_count,
                       CASE WHEN c.owner_id = :uid1 THEN 1 ELSE 0 END as is_owner,
                       CASE WHEN cm2.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member
                FROM " . DB::TBL_CANVASES . " c
                LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :uid2
                $joinRolesSql
                $whereClause
                ORDER BY c.id DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':uid1', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':uid2', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':uid3', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':uid4', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        $results = array_map(function($canvas) {
            $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
            $canvas['is_owner'] = (bool)$canvas['is_owner'];
            return $canvas;
        }, $results);

        return array_map([$this, 'appendSnapshotUrl'], $results);
    }

    public function getUserCanvasesPaginated(int $ownerId, int $limit, int $offset): array {
        $sql = "SELECT c.id, c.uuid, c.name, c.privacy, c.requires_approval, c.size, c.palette_id, c.max_participants, c.cooldown_pixels_batch, c.cooldown_seconds, c.created_at, c.is_official, c.is_locked, c.locked_reasons, c.favorites_count,
                       CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                       c.members_count
                FROM " . DB::TBL_CANVASES . " c
                LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :oid
                WHERE c.owner_id = :oid 
                ORDER BY c.id DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':oid', $ownerId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        $results = array_map(function($canvas) {
            $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
            return $canvas;
        }, $results);

        return array_map([$this, 'appendSnapshotUrl'], $results);
    }

    public function countUserCanvases(int $ownerId): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " WHERE owner_id = :oid";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':oid' => $ownerId]);
        return (int)$stmt->fetchColumn();
    }

    public function countOlderCanvases(int $canvasId, int $ownerId, string $createdAt): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " WHERE owner_id = :oid AND (created_at < :ca OR (created_at = :ca2 AND id < :id))";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':oid' => $ownerId, ':ca' => $createdAt, ':ca2' => $createdAt, ':id' => $canvasId]);
        return (int)$stmt->fetchColumn();
    }

    public function deleteCanvases(array $canvasIds, int $ownerId): bool {
        if (empty($canvasIds)) {
            return false;
        }

        $placeholders = implode(',', array_fill(0, count($canvasIds), '?'));
        
        $sql = "DELETE FROM " . DB::TBL_CANVASES . " WHERE id IN ($placeholders) AND owner_id = ?";
        $stmt = $this->db->prepare($sql);
        
        $params = array_merge($canvasIds, [$ownerId]);
        $success = $stmt->execute($params);
        if ($success) {
            $client = $this->typesenseManager->getClient();
            if ($client) {
                foreach ($canvasIds as $id) {
                    try {
                        $client->collections['canvases']->documents[(string)$id]->delete();
                    } catch (Exception $e) {
                        Logger::error("Typesense Delete Error (Canvas {$id}): " . $e->getMessage());
                    }
                }
            }
        }

        return $success;
    }

    public function getByIdAndOwner(int $id, int $ownerId): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE id = :id AND owner_id = :owner_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id' => $id, 
            ':owner_id' => $ownerId
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $this->appendSnapshotUrl($result) : null;
    }

    public function getById(int $id): ?array {
        $cacheKey = CacheConstants::PREFIX_CANVAS_DETAIL . $id;
        if ($this->redisClient) {
            $cached = $this->redisClient->get($cacheKey);
            if ($cached) return json_decode($cached, true);
        }

        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE id = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $final = $result ? $this->appendSnapshotUrl($result) : null;
        
        if ($final && $this->redisClient) {
            $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($final));
        }
        
        return $final;
    }



    public function updateCanvasData(int $id, array $data): bool {
        $sql = "UPDATE " . DB::TBL_CANVASES . " 
                SET name = :name, 
                    privacy = :privacy, 
                    requires_approval = :requires_approval,
                    palette_id = :palette_id,
                    max_participants = :max_participants,
                    cooldown_pixels_batch = :cooldown_pixels_batch,
                    cooldown_seconds = :cooldown_seconds,
                    allow_purchases = :allow_purchases,
                    allow_chat = :allow_chat,
                    tags = :tags
                ";

        if (isset($data['is_official'])) {
            $sql .= ", is_official = :is_official";
        }
        $sql .= " WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        $params = [
            ':name'                  => $data['name'],
            ':privacy'               => $data['privacy'],
            ':requires_approval'     => $data['requires_approval'],
            ':palette_id'            => $data['palette_id'],
            ':max_participants'      => $data['max_participants'],
            ':cooldown_pixels_batch' => $data['cooldown_pixels_batch'],
            ':cooldown_seconds'      => $data['cooldown_seconds'],
            ':allow_purchases'       => $data['allow_purchases'] ?? 1,
            ':allow_chat'            => $data['allow_chat'] ?? 0,
            ':tags'                  => isset($data['tags']) ? json_encode($data['tags']) : null,
            ':id'                    => $id
        ];
        if (isset($data['is_official'])) {
            $params[':is_official'] = $data['is_official'];
        }
        $success = $stmt->execute($params);
        if ($success) {
            $this->invalidateCanvasCache($id);
            $client = $this->typesenseManager->getClient();
            if ($client) {
                try {
                    $document = [
                        'name'    => $data['name'],
                        'privacy' => $data['privacy']
                    ];
                    if (isset($data['is_official'])) {
                        $document['is_official'] = $data['is_official'];
                    }
                    $client->collections['canvases']->documents[(string)$id]->update($document);
                } catch (Exception $e) {
                    Logger::error("Typesense Update Error (Canvas ID {$id}): " . $e->getMessage());
                }
            }
        }

        return $success;
    }

    public function updateSize(int $canvasId, string $newSize): bool {
        $sql = "UPDATE " . DB::TBL_CANVASES . " SET size = :size WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([
            ':size' => $newSize, 
            ':id' => $canvasId
        ]);
        if ($success) $this->invalidateCanvasCache($canvasId);
        return $success;
    }

    public function createAccessRequest(int $canvasId, int $userId): bool {
        $sql = "INSERT INTO " . DB::TBL_CANVAS_ACCESS_REQUESTS . " (canvas_id, user_id, status) 
                VALUES (:canvas_id, :user_id, 'pending')
                ON DUPLICATE KEY UPDATE status = 'pending', updated_at = CURRENT_TIMESTAMP";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id' => $canvasId,
            ':user_id' => $userId
        ]);
    }

    public function getAccessRequest(int $canvasId, int $userId): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_ACCESS_REQUESTS . " WHERE canvas_id = :canvas_id AND user_id = :user_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId, ':user_id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function getRequestById(int $requestId): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_ACCESS_REQUESTS . " WHERE id = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $requestId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function updateRequestStatus(int $requestId, string $status): bool {
        $sql = "UPDATE " . DB::TBL_CANVAS_ACCESS_REQUESTS . " SET status = :status WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':status' => $status, ':id' => $requestId]);
    }

    public function getPendingRequests(int $canvasId): array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_ACCESS_REQUESTS . " WHERE canvas_id = :canvas_id AND status = 'pending' ORDER BY created_at ASC";
            $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function syncUserRoles(int $canvasId, int $userId, array $roleIds): bool {
        try {
            $this->pdo->beginTransaction();

            $stmtDelete = $this->pdo->prepare("DELETE FROM " . DB::TBL_CANVAS_USER_ROLES . " WHERE canvas_id = :cid AND user_id = :uid");
            $stmtDelete->execute(['cid' => $canvasId, 'uid' => $userId]);

            if (!empty($roleIds)) {
                $stmtInsert = $this->pdo->prepare("INSERT IGNORE INTO " . DB::TBL_CANVAS_USER_ROLES . " (canvas_id, user_id, role_id) VALUES (:cid, :uid, :rid)");
                foreach ($roleIds as $roleId) {
                    $stmtInsert->execute(['cid' => $canvasId, 'uid' => $userId, 'rid' => $roleId]);
                }
            }

            $this->pdo->commit();
            return true;
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            Logger::error('Error in syncUserRoles.', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function getMemberRoles(int $canvasId, int $userId): array {
        $sql = "SELECT r.* 
                FROM " . DB::TBL_CANVAS_USER_ROLES . " cur
                INNER JOIN " . DB::TBL_CANVAS_ROLES . " r ON cur.role_id = r.id
                WHERE cur.canvas_id = :canvas_id AND cur.user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId, ':user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }



    public function hasCanvasPermission(int $canvasId, int $userId, string $permission): bool {
        $sql = "SELECT 1 
                FROM " . DB::TBL_CANVAS_USER_ROLES . " cur
                INNER JOIN " . DB::TBL_CANVAS_ROLES . " r ON cur.role_id = r.id
                INNER JOIN " . DB::TBL_CANVAS_ROLE_PERMISSIONS . " crp ON r.id = crp.role_id
                INNER JOIN " . DB::TBL_CANVAS_PERMISSIONS . " p ON crp.permission_id = p.id
                WHERE cur.canvas_id = :canvas_id 
                  AND cur.user_id = :user_id 
                  AND p.name = :permission
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':canvas_id' => $canvasId, 
            ':user_id' => $userId,
            ':permission' => $permission
        ]);
        return (bool)$stmt->fetchColumn();
    }

    public function assignMemberRole(int $canvasId, int $userId, int $roleId): bool {
        $sql = "INSERT IGNORE INTO " . DB::TBL_CANVAS_USER_ROLES . " (canvas_id, user_id, role_id) 
                VALUES (:canvas_id, :user_id, :role_id)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id' => $canvasId,
            ':user_id' => $userId,
            ':role_id' => $roleId
        ]);
    }

    public function removeMemberRole(int $canvasId, int $userId, int $roleId): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_USER_ROLES . " 
                WHERE canvas_id = :canvas_id AND user_id = :user_id AND role_id = :role_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id' => $canvasId,
            ':user_id' => $userId,
            ':role_id' => $roleId
        ]);
    }

    public function getCanvasRoles(?int $canvasId = null): array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_ROLES . " WHERE canvas_id IS NULL OR canvas_id = :canvas_id ORDER BY weight DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($roles as &$role) {
            $sqlPerms = "SELECT p.name 
                         FROM " . DB::TBL_CANVAS_ROLE_PERMISSIONS . " crp
                         INNER JOIN " . DB::TBL_CANVAS_PERMISSIONS . " p ON crp.permission_id = p.id
                         WHERE crp.role_id = :role_id";
            $stmtPerms = $this->db->prepare($sqlPerms);
            $stmtPerms->execute([':role_id' => $role['id']]);
            $role['permissions'] = $stmtPerms->fetchAll(PDO::FETCH_COLUMN) ?: [];
        }
        
        return $roles;
    }

    public function getCanvasPermissions(): array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_PERMISSIONS . " ORDER BY id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function createCanvasRole(int $canvasId, string $name, array $permissions, int $weight = 10, int $isSystem = 0): int {
        try {
            $this->db->beginTransaction();
            
            $sql = "INSERT INTO " . DB::TBL_CANVAS_ROLES . " (canvas_id, name, weight, is_system) 
                    VALUES (:canvas_id, :name, :weight, :is_system)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':canvas_id' => $canvasId,
                ':name' => $name,
                ':weight' => $weight,
                ':is_system' => $isSystem
            ]);
            $roleId = (int)$this->db->lastInsertId();
            
            if (!empty($permissions)) {
                $this->syncRolePermissions($roleId, $permissions);
            }
            
            $this->db->commit();
            return $roleId;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Logger::error("createCanvasRole Error: " . $e->getMessage());
            throw $e;
        }
    }

    public function updateCanvasRole(int $roleId, int $canvasId, string $name, ?array $permissions = null, int $weight = 10): bool {
        try {
            $this->db->beginTransaction();
            
            $sql = "UPDATE " . DB::TBL_CANVAS_ROLES . " SET name = :name, weight = :weight WHERE id = :id AND canvas_id = :canvas_id AND is_system = 0";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':name' => $name,
                ':weight' => $weight,
                ':id' => $roleId,
                ':canvas_id' => $canvasId
            ]);
            
            if ($permissions !== null) {
                $this->syncRolePermissions($roleId, $permissions);
            }
            
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Logger::error("updateCanvasRole Error: " . $e->getMessage());
            return false;
        }
    }

    public function updateCanvasRolePermissions(int $roleId, array $permissions): bool {
        try {
            $this->db->beginTransaction();
            $this->syncRolePermissions($roleId, $permissions);
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Logger::error("updateCanvasRolePermissions Error: " . $e->getMessage());
            return false;
        }
    }

    public function deleteCanvasRole(int $roleId, int $canvasId): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_ROLES . " WHERE id = :id AND canvas_id = :canvas_id AND is_system = 0";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':id' => $roleId,
            ':canvas_id' => $canvasId
        ]);
    }

    private function syncRolePermissions(int $roleId, array $permissions) {
        $delSql = "DELETE FROM " . DB::TBL_CANVAS_ROLE_PERMISSIONS . " WHERE role_id = :role_id";
        $delStmt = $this->db->prepare($delSql);
        $delStmt->execute([':role_id' => $roleId]);
        
        if (empty($permissions)) return;
        $placeholders = implode(',', array_fill(0, count($permissions), '?'));
        $permSql = "SELECT id FROM " . DB::TBL_CANVAS_PERMISSIONS . " WHERE name IN ($placeholders)";
        $permStmt = $this->db->prepare($permSql);
        $permStmt->execute($permissions);
        $permIds = $permStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($permIds)) return;
        
        $insertSql = "INSERT INTO " . DB::TBL_CANVAS_ROLE_PERMISSIONS . " (role_id, permission_id) VALUES (?, ?)";
        $insertStmt = $this->db->prepare($insertSql);
        foreach ($permIds as $pid) {
            $insertStmt->execute([$roleId, $pid]);
        }
    }

    public function countCanvasMembers(int $canvasId): int {
        $sql = "SELECT COUNT(DISTINCT user_id) FROM " . DB::TBL_CANVAS_USER_ROLES . " WHERE canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return (int)$stmt->fetchColumn();
    }

    public function getUserStorageUsed(int $userId): float {
        // Obtenemos el almacenamiento del Identity DB
        $dbManager = new DatabaseManager();
        $userRepo = new \App\Core\Repositories\UserRepository($dbManager, new \App\Core\Repositories\RoleRepository($dbManager, new \App\Config\Database\RedisCache()));
        return $userRepo->getStorageUsed($userId);
    }

    public function countCanvasSnapshots(int $canvasId): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " WHERE canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return (int)$stmt->fetchColumn();
    }

    public function getCanvasByUuid(string $uuid): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uuid' => $uuid]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function deleteCanvasByUuid(string $uuid): bool {
        $canvas = $this->getCanvasByUuid($uuid); 

        $sql = "DELETE FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([':uuid' => $uuid]);

        if ($success && $canvas) {
            $client = $this->typesenseManager->getClient();
            if ($client) {
                try {
                    $client->collections['canvases']->documents[(string)$canvas['id']]->delete();
                } catch (Exception $e) {
                    Logger::error("Typesense Delete UUID Error (Canvas ID {$canvas['id']}): " . $e->getMessage());
                }
            }
        }

        return $success;
    }

        public function removeMember(int $canvasId, int $userId): bool {
        try {
            $this->db->beginTransaction();
            
            $sqlRoles = "DELETE FROM " . DB::TBL_CANVAS_USER_ROLES . " WHERE canvas_id = :canvas_id AND user_id = :user_id";
            $stmtRoles = $this->db->prepare($sqlRoles);
            $stmtRoles->execute([
                ':canvas_id' => $canvasId,
                ':user_id'   => $userId
            ]);
            
            $sqlMembers = "DELETE FROM " . DB::TBL_CANVAS_MEMBERS . " WHERE canvas_id = :canvas_id AND user_id = :user_id";
            $stmtMembers = $this->db->prepare($sqlMembers);
            $stmtMembers->execute([
                ':canvas_id' => $canvasId,
                ':user_id'   => $userId
            ]);
            
            if ($stmtMembers->rowCount() > 0) {
                $stmtUpdate = $this->db->prepare("UPDATE " . DB::TBL_CANVASES . " SET members_count = GREATEST(members_count - 1, 0) WHERE id = :cid");
                $stmtUpdate->execute([':cid' => $canvasId]);
            }
            
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Logger::error("removeMember Error: " . $e->getMessage());
            return false;
        }
    }

    public function trimMembersToLimit(int $canvasId, int $limit): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_USER_ROLES . "
                WHERE canvas_id = :canvas_id 
                AND user_id NOT IN (
                    SELECT user_id FROM (
                        SELECT user_id FROM " . DB::TBL_CANVAS_USER_ROLES . " 
                        WHERE canvas_id = :canvas_id2 
                        ORDER BY canvas_id ASC 
                        LIMIT :limit
                    ) AS tmp
                )";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':canvas_id', $canvasId, PDO::PARAM_INT);
        $stmt->bindValue(':canvas_id2', $canvasId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', max(1, $limit), PDO::PARAM_INT);
        $rolesDeleted = $stmt->execute();
        $sqlClean = "DELETE FROM " . DB::TBL_CANVAS_MEMBERS . " 
                     WHERE canvas_id = :canvas_id 
                     AND user_id NOT IN (
                         SELECT user_id FROM " . DB::TBL_CANVAS_USER_ROLES . " WHERE canvas_id = :canvas_id2
                     )";
        $stmtClean = $this->db->prepare($sqlClean);
        $stmtClean->bindValue(':canvas_id', $canvasId, PDO::PARAM_INT);
        $stmtClean->bindValue(':canvas_id2', $canvasId, PDO::PARAM_INT);
        $stmtClean->execute();
        
        return $rolesDeleted;
    }

    public function getSnapshot(int $canvasId): ?string {
        $sql = "SELECT snapshot_data FROM " . DB::TBL_CANVAS_SNAPSHOTS . " WHERE canvas_id = :canvas_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        
        $result = $stmt->fetchColumn();
        return $result ? @gzuncompress($result) : null;
    }

    public function saveSnapshot(int $canvasId, string $snapshotData): bool {
        $compressed = gzcompress($snapshotData);
        
        $sql = "INSERT INTO " . DB::TBL_CANVAS_SNAPSHOTS . " (canvas_id, snapshot_data) 
                VALUES (:canvas_id, :data)
                ON DUPLICATE KEY UPDATE snapshot_data = :update_data, last_updated = CURRENT_TIMESTAMP";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id'   => $canvasId,
            ':data'        => $compressed,
            ':update_data' => $compressed
        ]);
    }

    public function clearCanvasData(int $canvasId): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_SNAPSHOTS . " WHERE canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':canvas_id' => $canvasId]);
    }

    public function getResetSettings(int $canvasId): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_RESET_SETTINGS . " WHERE canvas_id = :canvas_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function updateResetSettings(int $canvasId, array $settings): bool {
        $sql = "INSERT INTO " . DB::TBL_CANVAS_RESET_SETTINGS . " 
                (canvas_id, is_active, next_reset_at, take_snapshot)
                VALUES 
                (:canvas_id, :is_active, :next_reset_at, :take_snapshot)
                ON DUPLICATE KEY UPDATE 
                is_active = :upd_is_active,
                next_reset_at = :upd_next_reset_at,
                take_snapshot = :upd_take_snapshot";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id'         => $canvasId,
            ':is_active'         => $settings['is_active'],
            ':next_reset_at'     => $settings['next_reset_at'],
            ':take_snapshot'     => $settings['take_snapshot'],
            
            ':upd_is_active'     => $settings['is_active'],
            ':upd_next_reset_at' => $settings['next_reset_at'],
            ':upd_take_snapshot' => $settings['take_snapshot']
        ]);
    }

    public function getResizeSettings(int $canvasId): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_RESIZE_SETTINGS . " WHERE canvas_id = :canvas_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function updateResizeSettings(int $canvasId, array $settings): bool {
        $sql = "INSERT INTO " . DB::TBL_CANVAS_RESIZE_SETTINGS . " 
                (canvas_id, is_active, next_resize_at, target_size)
                VALUES 
                (:canvas_id, :is_active, :next_resize_at, :target_size)
                ON DUPLICATE KEY UPDATE 
                is_active = :upd_is_active,
                next_resize_at = :upd_next_resize_at,
                target_size = :upd_target_size";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id'         => $canvasId,
            ':is_active'         => $settings['is_active'],
            ':next_resize_at'    => $settings['next_resize_at'],
            ':target_size'       => $settings['target_size'],
            
            ':upd_is_active'     => $settings['is_active'],
            ':upd_next_resize_at'=> $settings['next_resize_at'],
            ':upd_target_size'   => $settings['target_size']
        ]);
    }

    public function getSnapshotByUuid(string $uuid): ?array {
        $sql = "SELECT h.*, c.name as canvas_name, c.uuid as original_canvas_uuid, c.size, c.palette_id
                FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " h
                INNER JOIN " . DB::TBL_CANVASES . " c ON h.canvas_id = c.id
                WHERE h.snapshot_uuid = :uuid LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uuid' => $uuid]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function getSnapshotsByCanvasId(int $canvasId): array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " 
                WHERE canvas_id = :canvas_id 
                ORDER BY created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getSnapshotsHistoryByUuid(string $uuid): array {
        $sql = "SELECT h.id, h.snapshot_uuid, h.file_path, h.created_at, c.privacy, 
                       (SELECT COUNT(*) FROM " . DB::TBL_CANVAS_SNAPSHOTS_LIKES . " l WHERE l.snapshot_id = h.id) as likes_count
                FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " h
                INNER JOIN " . DB::TBL_CANVASES . " c ON h.canvas_id = c.id
                WHERE c.uuid = :uuid
                ORDER BY h.created_at DESC";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uuid' => $uuid]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function saveTemplateMetadata(int $userId, string $filePath, int $fileSize = 0): int {
        $sql = "INSERT INTO " . DB::TBL_USER_TEMPLATES . " (user_id, file_path, file_size) 
                VALUES (:user_id, :file_path, :file_size)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id'   => $userId,
            ':file_path' => $filePath,
            ':file_size' => $fileSize
        ]);

        $insertId = (int)$this->db->lastInsertId();

        if ($fileSize > 0) {
            $dbManager = new DatabaseManager();
            $userRepo = new \App\Core\Repositories\UserRepository($dbManager, new \App\Core\Repositories\RoleRepository($dbManager, new \App\Config\Database\RedisCache()));
            $userRepo->updateStorageUsed($userId, $fileSize);
        }

        return $insertId;
    }

    public function getUserTemplates(int $userId): array {
        $sql = "SELECT id, user_id, file_path, created_at 
                FROM " . DB::TBL_USER_TEMPLATES . " 
                WHERE user_id = :user_id 
                ORDER BY created_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function deleteTemplate(int $templateId, int $userId): bool {
        // Fetch file size first to decrement storage
        $stmt = $this->db->prepare("SELECT file_size FROM " . DB::TBL_USER_TEMPLATES . " WHERE id = :id AND user_id = :user_id");
        $stmt->execute([':id' => $templateId, ':user_id' => $userId]);
        $fileSize = (int)$stmt->fetchColumn();

        $sql = "DELETE FROM " . DB::TBL_USER_TEMPLATES . " 
                WHERE id = :id AND user_id = :user_id";
        
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            ':id'      => $templateId,
            ':user_id' => $userId
        ]);

        if ($result && $fileSize > 0) {
            $dbManager = new DatabaseManager();
            $userRepo = new \App\Core\Repositories\UserRepository($dbManager, new \App\Core\Repositories\RoleRepository($dbManager, new \App\Config\Database\RedisCache()));
            $userRepo->updateStorageUsed($userId, -$fileSize);
        }

        return $result;
    }

    public function toggleFavorite(int $userId, int $canvasId): array {
        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT 1 FROM " . DB::TBL_CANVAS_FAVORITES . " WHERE user_id = :user_id AND canvas_id = :canvas_id LIMIT 1");
            $stmt->execute([':user_id' => $userId, ':canvas_id' => $canvasId]);
            $isFavorite = $stmt->fetchColumn();

            if ($isFavorite) {
                $delStmt = $this->db->prepare("DELETE FROM " . DB::TBL_CANVAS_FAVORITES . " WHERE user_id = :user_id AND canvas_id = :canvas_id");
                $delStmt->execute([':user_id' => $userId, ':canvas_id' => $canvasId]);

                $updStmt = $this->db->prepare("UPDATE " . DB::TBL_CANVASES . " SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = :canvas_id");
                $updStmt->execute([':canvas_id' => $canvasId]);

                $action = 'removed';
            } else {
                $insStmt = $this->db->prepare("INSERT INTO " . DB::TBL_CANVAS_FAVORITES . " (user_id, canvas_id) VALUES (:user_id, :canvas_id)");
                $insStmt->execute([':user_id' => $userId, ':canvas_id' => $canvasId]);

                $updStmt = $this->db->prepare("UPDATE " . DB::TBL_CANVASES . " SET favorites_count = favorites_count + 1 WHERE id = :canvas_id");
                $updStmt->execute([':canvas_id' => $canvasId]);

                $action = 'added';
            }

            $countStmt = $this->db->prepare("SELECT favorites_count FROM " . DB::TBL_CANVASES . " WHERE id = :canvas_id");
            $countStmt->execute([':canvas_id' => $canvasId]);
            $newCount = (int)$countStmt->fetchColumn();

            $this->db->commit();

            return [
                'action' => $action,
                'favorites_count' => $newCount
            ];

        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function isFavorite(int $userId, int $canvasId): bool {
        $stmt = $this->db->prepare("SELECT 1 FROM " . DB::TBL_CANVAS_FAVORITES . " WHERE user_id = :user_id AND canvas_id = :canvas_id LIMIT 1");
        $stmt->execute([':user_id' => $userId, ':canvas_id' => $canvasId]);
        return (bool)$stmt->fetchColumn();
    }
    public function createInvite(int $canvasId, string $code, string $roleId, ?int $maxUses, ?string $expiresAt, int $createdBy): int {
        $sql = "INSERT INTO " . DB::TBL_CANVAS_INVITES . " (canvas_id, code, role, max_uses, expires_at, created_by) 
                VALUES (:canvas_id, :code, :role_id, :max_uses, :expires_at, :created_by)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':canvas_id' => $canvasId,
            ':code' => $code,
            ':role_id' => (string)$roleId,
            ':max_uses' => $maxUses,
            ':expires_at' => $expiresAt,
            ':created_by' => $createdBy
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function getInvites(int $canvasId): array {
        $sql = "SELECT i.*, u.username as creator_name 
                FROM " . DB::TBL_CANVAS_INVITES . " i
                LEFT JOIN users u ON i.created_by = u.id
                WHERE i.canvas_id = :canvas_id
                ORDER BY i.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getInviteByCode(string $code): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_INVITES . " WHERE code = :code LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':code' => $code]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function incrementInviteUses(int $inviteId): bool {
        $sql = "UPDATE " . DB::TBL_CANVAS_INVITES . " 
                SET uses_count = uses_count + 1 
                WHERE id = :id AND (max_uses IS NULL OR uses_count < max_uses)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $inviteId]);
        return $stmt->rowCount() > 0;
    }

    public function revokeInvite(int $inviteId, int $canvasId): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_INVITES . " WHERE id = :id AND canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $inviteId, ':canvas_id' => $canvasId]);
    }

    public function getUserCanvasWeight(int $userId, int $canvasId): int {
        $redis = null;
        $cacheKey = "canvas_weight:u{$userId}:c{$canvasId}";
        if (class_exists(\App\Config\Database\RedisCache::class)) {
            try {
                $redisInstance = new \App\Config\Database\RedisCache();
                $redis = $redisInstance->getClient();
                if ($redis) {
                    $cached = $redis->get($cacheKey);
                    if ($cached !== null) {
                        return (int)$cached;
                    }
                }
            } catch (\Exception $e) {}
        }

        $sql = "SELECT r.weight 
                FROM " . DB::TBL_CANVAS_ROLES . " r 
                JOIN " . DB::TBL_CANVAS_USER_ROLES . " ur ON r.id = ur.role_id 
                WHERE ur.canvas_id = :cid AND ur.user_id = :uid 
                ORDER BY r.weight DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':cid' => $canvasId, ':uid' => $userId]);
        $weight = $stmt->fetchColumn();
        $weight = $weight !== false ? (int)$weight : 0;

        if ($redis) {
            try {
                $redis->setex($cacheKey, 300, (string)$weight);
            } catch (\Exception $e) {}
        }

        return $weight;
    }
}
?>
