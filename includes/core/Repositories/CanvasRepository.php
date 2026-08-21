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
use App\Core\System\CacheInvalidator;
use App\Config\Database\RedisCache;

class CanvasRepository implements CanvasRepositoryInterface {
    private $db;
    private TypesenseManager $typesenseManager;
    private $redisCache;
    private $redisClient;
    private CacheInvalidator $cacheInvalidator;

    public function __construct(DatabaseManager $databaseManager, TypesenseManager $typesenseManager, RedisCache $redisCache = null) {
        $this->db = $databaseManager->getConnection(DB::CONN_CANVASES);
        $this->typesenseManager = $typesenseManager;
        $this->redisCache = $redisCache;
        $this->redisClient = $redisCache ? $redisCache->getClient() : null;
        $this->cacheInvalidator = new CacheInvalidator($this->redisClient);
    }

    private function invalidateCanvasCache(int $id): void {
        $this->cacheInvalidator->canvas($id);
    }

    private function invalidateUserCanvasListCaches(int $userId): void {
        $this->cacheInvalidator->userCanvasList($userId);
    }

    private function invalidateMemberCache(int $canvasId, int $userId): void {
        $this->cacheInvalidator->canvasMember($canvasId, $userId);
    }

    private function appendSnapshotUrl(array $canvas): array {
        $identifier = $canvas['uuid'] ?? $canvas['id'] ?? null;
        if (!$identifier) {
            $canvas['thumbnail_url'] = null;
            return $canvas;
        }

        $v = null;
        if ($this->redisClient && isset($canvas['uuid'])) {
            try {
                $v = $this->redisClient->get("canvas:{$canvas['uuid']}:thumbnail_version");
            } catch (\Throwable $e) {
                // Ignore Redis errors
            }
        }

        $s3Key = "thumbnails/canvas_" . $identifier . ".webp";
        $s3Url = \App\Core\Helpers\Utils::getS3PublicUrl($s3Key);
        $canvas['thumbnail_url'] = $v ? $s3Url . "?v=" . $v : $s3Url;

        return $canvas;
    }
    public function create(array $canvasData): int {
        $sql = "INSERT INTO " . DB::TBL_CANVASES . "
            (uuid, owner_id, name, privacy, requires_approval, size, palette_id,
             mode, is_online_active, storage_bytes,
             max_participants, cooldown_pixels_batch, cooldown_seconds,
             allow_chat, tags)
            VALUES
            (:uuid, :owner_id, :name, :privacy, :requires_approval, :size, :palette_id,
             :mode, :is_online_active, :storage_bytes,
             :max_participants, :cooldown_pixels_batch, :cooldown_seconds,
             :allow_chat, :tags)";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':uuid'                  => $canvasData['uuid'],
            ':owner_id'              => $canvasData['owner_id'],
            ':name'                  => $canvasData['name'],
            ':privacy'               => $canvasData['privacy'],
            ':requires_approval'     => $canvasData['requires_approval'] ?? 0,
            ':size'                  => $canvasData['size'],
            ':palette_id'            => $canvasData['palette_id'] ?? 'default',
            ':mode'                  => $canvasData['mode'] ?? 'offline',
            ':is_online_active'      => $canvasData['is_online_active'] ?? 0,
            ':storage_bytes'         => $canvasData['storage_bytes'] ?? 0,
            ':max_participants'      => $canvasData['max_participants'] ?? null,
            ':cooldown_pixels_batch' => $canvasData['cooldown_pixels_batch'] ?? 1,
            ':cooldown_seconds'      => $canvasData['cooldown_seconds'] ?? 0,
            ':allow_chat'            => $canvasData['allow_chat'] ?? 0,
            ':tags'                  => isset($canvasData['tags']) ? json_encode($canvasData['tags']) : null
        ]);
        $id = (int)$this->db->lastInsertId();
        try {
            $isOnline = (($canvasData['mode'] ?? 'offline') === 'online' && !empty($canvasData['is_online_active']));
            $isPublic = (($canvasData['privacy'] ?? 'private') === 'public');
            if ($isOnline && $isPublic) {
                $client = $this->typesenseManager->getClient();
                if ($client) {
                    $document = [
                        'id'         => (string)$id,
                        'uuid'       => $canvasData['uuid'],
                        'name'       => $canvasData['name'],
                        'owner_id'   => (int)$canvasData['owner_id'],
                        'privacy'    => $canvasData['privacy'],
                        'created_at' => time()
                    ];
                    $client->collections['canvases']->documents->create($document);
                }
            }
        } catch (Exception $e) {
            Logger::error("Typesense Create Error (Canvas ID {$id}): " . $e->getMessage());
        }

        // Invalidate owner list caches
        $this->invalidateUserCanvasListCaches((int)$canvasData['owner_id']);

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
            $this->invalidateMemberCache($canvasId, $userId);
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
        if ($this->redisClient) {
            // Shared base cache (no per-user is_favorite for guests, short TTL for logged users)
            $cacheKey = CacheConstants::PREFIX_CANVAS_PUBLIC_PAGE . "{$sort}:{$limit}:{$offset}";
            $cached = $this->redisClient->get($cacheKey);
            if ($cached) {
                $data = json_decode($cached, true);
                // For logged-in users resolve their is_favorite and is_member from lightweight queries
                if ($currentUserId !== null && is_array($data) && !empty($data)) {
                    $ids = array_column($data, 'id');
                    $ph = implode(',', array_fill(0, count($ids), '?'));
                    try {
                        $stmtFav = $this->db->prepare("SELECT canvas_id FROM " . DB::TBL_CANVAS_FAVORITES . " WHERE user_id = ? AND canvas_id IN ({$ph})");
                        $stmtFav->execute(array_merge([$currentUserId], $ids));
                        $favIds = array_flip($stmtFav->fetchAll(PDO::FETCH_COLUMN));

                        $stmtMem = $this->db->prepare("SELECT canvas_id FROM (SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_MEMBERS . " UNION SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_USER_ROLES . ") cm WHERE user_id = ? AND canvas_id IN ({$ph})");
                        $stmtMem->execute(array_merge([$currentUserId], $ids));
                        $memIds = array_flip($stmtMem->fetchAll(PDO::FETCH_COLUMN));

                        foreach ($data as &$c) { 
                            $c['is_favorite'] = isset($favIds[$c['id']]); 
                            $c['is_member'] = isset($memIds[$c['id']]);
                        }
                    } catch (\Throwable $e) {}
                }
                return $data;
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
                $joinMemberSql = "LEFT JOIN (SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_MEMBERS . " UNION SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_USER_ROLES . ") cm ON c.id = cm.canvas_id AND cm.user_id = :current_user_id_member";
                $isMemberSelect = "CASE WHEN cm.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member";
            }

            $sql = "SELECT c.id, c.uuid, c.name, c.owner_id, c.favorites_count,
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                           c.members_count,
                           $isMemberSelect
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :current_user_id
                    $joinMemberSql
                    WHERE c.privacy = 'public' AND c.is_subscription_locked = 0 AND (c.mode = 'online' OR c.is_online_active = 1)
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
        $cacheKey = null;
        $cacheTtl = CacheConstants::TTL_FIVE_MINS;
        if ($this->redisClient) {
            if ($userId === null) {
                // Guests: shared cache, 5 min TTL
                $cacheKey = CacheConstants::PREFIX_CANVAS_HOME_FEED . "{$tagFilter}:{$limit}:{$offset}";
            } else {
                // Logged-in users: per-user cache, 2 min TTL (shorter to reflect membership changes faster)
                $cacheTtl = 120;
                $cacheKey = CacheConstants::PREFIX_CANVAS_HOME_FEED . "u{$userId}:{$tagFilter}:{$limit}:{$offset}";
            }
            $cached = $this->redisClient->get($cacheKey);
            if ($cached) {
                return json_decode($cached, true);
            }
        }

        $fetchClosure = function() use ($userId, $tagFilter, $limit, $offset) {
            $params = [];
            $whereConditions = [];
            
            if ($tagFilter !== 'all') {
                $whereConditions[] = "JSON_CONTAINS(c.tags, :tag)";
                $params[':tag'] = json_encode($tagFilter);
            }
            
            $userIdParam = $userId ?? 0;
            $whereConditions[] = "c.is_subscription_locked = 0 AND c.privacy = 'public' AND (c.mode = 'online' OR c.is_online_active = 1)";
            
            $whereSql = implode(' AND ', $whereConditions);

            $isMemberSelect = $userId ? "CASE WHEN EXISTS (SELECT 1 FROM (SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_MEMBERS . " UNION SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_USER_ROLES . ") cm_feed WHERE cm_feed.canvas_id = c.id AND cm_feed.user_id = :current_user_id_member_sel) THEN 1 ELSE 0 END as is_member" : "0 as is_member";

            $orderSql = "ORDER BY
                (c.members_count * 3 + c.favorites_count * 2 + TIMESTAMPDIFF(HOUR, c.created_at, NOW()) * -1) DESC,
                c.members_count DESC,
                c.favorites_count DESC,
                c.created_at DESC,
                c.id DESC";
            
            $sql = "SELECT c.id, c.uuid, c.name, c.owner_id, c.favorites_count, c.tags, c.is_subscription_locked, c.locked_reasons,
                           CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                           c.members_count,
                           $isMemberSelect
                    FROM " . DB::TBL_CANVASES . " c
                    LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :current_user_id_fav
                    WHERE $whereSql
                    $orderSql
                    LIMIT :limit OFFSET :offset";
                    
            $params[':current_user_id_fav'] = $userIdParam;
            if ($userId) {
                $params[':current_user_id_member_sel'] = $userIdParam;
            }
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
        };

        if ($cacheKey && $this->redisCache) {
            $lockKey = "lock_home_feed_" . ($userId ?? 'guest') . "_{$tagFilter}_{$limit}_{$offset}";
            return $this->redisCache->executeWithLock($lockKey, 5, function() use ($cacheKey, $cacheTtl, $fetchClosure) {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached) return json_decode($cached, true);
                
                $results = $fetchClosure();
                $this->redisClient->setex($cacheKey, $cacheTtl, json_encode($results));
                return $results;
            });
        }

        return $fetchClosure();
    }


    public function getUserAndJoinedCanvases(int $userId, int $limit = 50, string $filter = 'all', int $offset = 0): array {
        $cacheKey = CacheConstants::PREFIX_CANVAS_DASHBOARD . "u{$userId}:{$filter}:{$limit}:{$offset}";
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    return json_decode($cached, true) ?? [];
                }
            } catch (\Throwable $e) {}
        }
        $joinRolesSql = "LEFT JOIN (SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_MEMBERS . " UNION SELECT canvas_id, user_id FROM " . DB::TBL_CANVAS_USER_ROLES . ") cm2 ON c.id = cm2.canvas_id AND cm2.user_id = :uid_join";
        
        $params = [
            ':uid_sel' => $userId,
            ':uid_fav' => $userId,
            ':uid_join' => $userId,
            ':uid_owner' => $userId,
        ];

        $whereClause = "WHERE (c.owner_id = :uid_owner OR (cm2.canvas_id IS NOT NULL AND (c.mode = 'online' OR c.is_online_active = 1)))";
        if ($filter === 'mine') {
            $whereClause = "WHERE c.owner_id = :uid_owner";
        } elseif ($filter === 'joined') {
            $whereClause = "WHERE c.owner_id != :uid_owner AND cm2.canvas_id IS NOT NULL AND (c.mode = 'online' OR c.is_online_active = 1)";
        } elseif ($filter === 'managed') {
            $whereClause = "WHERE (c.owner_id = :uid_owner OR (EXISTS (SELECT 1 FROM " . DB::TBL_CANVAS_USER_ROLES . " cur JOIN canvas_role_permissions crp ON cur.role_id = crp.role_id WHERE cur.canvas_id = c.id AND cur.user_id = :uid_managed AND crp.permission_id IN (2, 3, 4, 5, 6, 7)) AND (c.mode = 'online' OR c.is_online_active = 1)))";
            $params[':uid_managed'] = $userId;
        } elseif ($filter === 'favorites') {
            $whereClause = "WHERE (c.owner_id = :uid_owner OR (cm2.canvas_id IS NOT NULL AND (c.mode = 'online' OR c.is_online_active = 1))) AND f.canvas_id IS NOT NULL";
        }

        $sql = "SELECT c.id, c.uuid, c.name, c.privacy, c.requires_approval, c.size, c.palette_id, c.max_participants, c.cooldown_pixels_batch, c.cooldown_seconds, c.created_at, c.owner_id, c.is_subscription_locked, c.locked_reasons, c.favorites_count,
                       c.mode, c.is_online_active, c.storage_bytes,
                       CASE WHEN f.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                       c.members_count,
                       CASE WHEN c.owner_id = :uid_sel THEN 1 ELSE 0 END as is_owner,
                       CASE WHEN cm2.canvas_id IS NOT NULL THEN 1 ELSE 0 END as is_member
                FROM " . DB::TBL_CANVASES . " c
                LEFT JOIN " . DB::TBL_CANVAS_FAVORITES . " f ON c.id = f.canvas_id AND f.user_id = :uid_fav
                $joinRolesSql
                $whereClause
                ORDER BY c.id DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        foreach ($params as $paramKey => $paramVal) {
            $stmt->bindValue($paramKey, $paramVal, PDO::PARAM_INT);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        
        $results = array_map(function($canvas) {
            $canvas['is_favorite'] = (bool)$canvas['is_favorite'];
            $canvas['is_owner'] = (bool)$canvas['is_owner'];
            return $canvas;
        }, $results);

        $final = array_map([$this, 'appendSnapshotUrl'], $results);

        if ($this->redisClient) {
            try {
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_TWO_MINS, json_encode($final));
            } catch (\Throwable $e) {}
        }

        return $final;
    }

    public function getUserCanvasesPaginated(int $ownerId, int $limit, int $offset): array {
        $cacheKey = CacheConstants::PREFIX_CANVAS_OWNER_LIST . "{$ownerId}:{$limit}:{$offset}";
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    return json_decode($cached, true) ?? [];
                }
            } catch (\Throwable $e) {}
        }

        $sql = "SELECT c.id, c.uuid, c.name, c.privacy, c.requires_approval, c.size, c.palette_id, c.max_participants, c.cooldown_pixels_batch, c.cooldown_seconds, c.created_at, c.is_subscription_locked, c.locked_reasons, c.favorites_count,
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

        $final = array_map([$this, 'appendSnapshotUrl'], $results);

        if ($this->redisClient) {
            try {
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($final));
            } catch (\Throwable $e) {}
        }

        return $final;
    }

    public function countUserCanvases(int $ownerId): int {
        $cacheKey = CacheConstants::PREFIX_CANVAS_COUNT . $ownerId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return (int)$cached;
            } catch (\Throwable $e) {}
        }

        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " WHERE owner_id = :oid";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':oid' => $ownerId]);
        $count = (int)$stmt->fetchColumn();

        if ($this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_MIN, (string)$count); } catch (\Throwable $e) {}
        }

        return $count;
    }

    public function countUserOnlineCanvases(int $ownerId): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " WHERE owner_id = :oid AND (mode = 'online' OR is_online_active = 1)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':oid' => $ownerId]);
        return (int)$stmt->fetchColumn();
    }

    public function countUserTierCanvases(int $ownerId, int $tier): int {
        $cacheKey = CacheConstants::PREFIX_CANVAS_TIER_COUNT . "{$ownerId}:{$tier}";
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return (int)$cached;
            } catch (\Throwable $e) {}
        }

        $allSizes = \App\Core\Helpers\Utils::getCanvasSizes();
        $tierSizes = [];
        foreach ($allSizes as $key => $conf) {
            if (isset($conf['tier']) && (int)$conf['tier'] === $tier) {
                $tierSizes[] = $key;
            }
        }

        if (empty($tierSizes)) return 0;

        $placeholders = implode(',', array_fill(0, count($tierSizes), '?'));
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " WHERE owner_id = ? AND size IN ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $params = array_merge([$ownerId], $tierSizes);
        $stmt->execute($params);
        $count = (int)$stmt->fetchColumn();

        if ($this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_MIN, (string)$count); } catch (\Throwable $e) {}
        }

        return $count;
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
            // Invalidate caches for each deleted canvas
            foreach ($canvasIds as $id) {
                $this->invalidateCanvasCache((int)$id);
            }
            $this->invalidateUserCanvasListCaches($ownerId);
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
            $this->redisClient->setex($cacheKey, CacheConstants::TTL_THIRTY_DAYS, json_encode($final));
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
                    allow_chat = :allow_chat,
                    tags = :tags
                ";

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
            ':allow_chat'            => $data['allow_chat'] ?? 0,
            ':tags'                  => isset($data['tags']) ? json_encode($data['tags']) : null,
            ':id'                    => $id
        ];
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
    
    public function updateChatStatus(int $canvasId, int $allowChat): bool {
        $sql = "UPDATE " . DB::TBL_CANVASES . " SET allow_chat = :allow_chat WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([
            ':allow_chat' => $allowChat,
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
            $this->db->beginTransaction();

            $stmtDelete = $this->db->prepare("DELETE FROM " . DB::TBL_CANVAS_USER_ROLES . " WHERE canvas_id = :cid AND user_id = :uid");
            $stmtDelete->execute(['cid' => $canvasId, 'uid' => $userId]);

            if (!empty($roleIds)) {
                // Ensure the user is a member of the canvas
                $stmtMember = $this->db->prepare("INSERT IGNORE INTO " . DB::TBL_CANVAS_MEMBERS . " (canvas_id, user_id) VALUES (:cid, :uid)");
                $stmtMember->execute(['cid' => $canvasId, 'uid' => $userId]);
                if ($stmtMember->rowCount() > 0) {
                    $stmtUpdate = $this->db->prepare("UPDATE " . DB::TBL_CANVASES . " SET members_count = members_count + 1 WHERE id = :cid");
                    $stmtUpdate->execute(['cid' => $canvasId]);
                    $this->invalidateCanvasCache($canvasId);
                }

                $stmtInsert = $this->db->prepare("INSERT IGNORE INTO " . DB::TBL_CANVAS_USER_ROLES . " (canvas_id, user_id, role_id) VALUES (:cid, :uid, :rid)");
                foreach ($roleIds as $roleId) {
                    $stmtInsert->execute(['cid' => $canvasId, 'uid' => $userId, 'rid' => $roleId]);
                }
            }

            $this->db->commit();

            // Invalidate member role and permission caches
            $this->invalidateMemberCache($canvasId, $userId);

            return true;
        } catch (\Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            Logger::error('Error in syncUserRoles.', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function getMemberRoles(int $canvasId, int $userId): array {
        $cacheKey = CacheConstants::PREFIX_CANVAS_MEMBER_ROLES . "{$canvasId}:{$userId}";
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return json_decode($cached, true) ?? [];
            } catch (\Throwable $e) {}
        }

        $sql = "SELECT r.* 
                FROM " . DB::TBL_CANVAS_USER_ROLES . " cur
                INNER JOIN " . DB::TBL_CANVAS_ROLES . " r ON cur.role_id = r.id
                WHERE cur.canvas_id = :canvas_id AND cur.user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId, ':user_id' => $userId]);
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        if ($this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($roles)); } catch (\Throwable $e) {}
        }

        return $roles;
    }

    public function hasCanvasPermission(int $canvasId, int $userId, string $permission): bool {
        $cacheKey = CacheConstants::PREFIX_CANVAS_PERMISSION . "{$canvasId}:{$userId}:" . md5($permission);
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return (bool)(int)$cached;
            } catch (\Throwable $e) {}
        }

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
        $stmt->execute([':canvas_id' => $canvasId, ':user_id' => $userId, ':permission' => $permission]);
        $result = (bool)$stmt->fetchColumn();

        if ($this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_MIN, $result ? '1' : '0'); } catch (\Throwable $e) {}
        }

        return $result;
    }

    public function assignMemberRole(int $canvasId, int $userId, int $roleId): bool {
        $sql = "INSERT IGNORE INTO " . DB::TBL_CANVAS_USER_ROLES . " (canvas_id, user_id, role_id) 
                VALUES (:canvas_id, :user_id, :role_id)";
        $stmt = $this->db->prepare($sql);
        $res = $stmt->execute([
            ':canvas_id' => $canvasId,
            ':user_id' => $userId,
            ':role_id' => $roleId
        ]);
        if ($res) {
            $this->invalidateMemberCache($canvasId, $userId);
        }
        return $res;
    }

    public function removeMemberRole(int $canvasId, int $userId, int $roleId): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_USER_ROLES . " 
                WHERE canvas_id = :canvas_id AND user_id = :user_id AND role_id = :role_id";
        $stmt = $this->db->prepare($sql);
        $res = $stmt->execute([
            ':canvas_id' => $canvasId,
            ':user_id' => $userId,
            ':role_id' => $roleId
        ]);
        if ($res) {
            $this->invalidateMemberCache($canvasId, $userId);
        }
        return $res;
    }

    public function getCanvasRoles(?int $canvasId = null): array {
        $cacheKey = CacheConstants::PREFIX_CANVAS_ROLES_LIST . ($canvasId ?? 'global');
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return json_decode($cached, true) ?? [];
            } catch (\Throwable $e) {}
        }

        // Single JOIN query to avoid N+1 pattern
        $sql = "SELECT r.*, p.name as perm_name
                FROM " . DB::TBL_CANVAS_ROLES . " r
                LEFT JOIN " . DB::TBL_CANVAS_ROLE_PERMISSIONS . " crp ON r.id = crp.role_id
                LEFT JOIN " . DB::TBL_CANVAS_PERMISSIONS . " p ON crp.permission_id = p.id
                WHERE r.canvas_id IS NULL OR r.canvas_id = :canvas_id
                ORDER BY r.weight DESC, r.id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        // Aggregate permissions per role
        $rolesMap = [];
        foreach ($rows as $row) {
            $rid = $row['id'];
            if (!isset($rolesMap[$rid])) {
                unset($row['perm_name']);
                $row['permissions'] = [];
                $rolesMap[$rid] = $row;
            }
            if ($row['perm_name'] !== null) {
                $rolesMap[$rid]['permissions'][] = $row['perm_name'];
            }
        }
        $roles = array_values($rolesMap);

        if ($this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_TEN_MINS, json_encode($roles)); } catch (\Throwable $e) {}
        }

        return $roles;
    }

    public function getRoleById(int $roleId, ?int $canvasId = null): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVAS_ROLES . " WHERE id = :id";
        $params = [':id' => $roleId];
        if ($canvasId !== null) {
            $sql .= " AND (canvas_id IS NULL OR canvas_id = :canvas_id)";
            $params[':canvas_id'] = $canvasId;
        }
        $sql .= " LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $role = $stmt->fetch(PDO::FETCH_ASSOC);
        return $role ?: null;
    }

    public function getCanvasPermissions(): array {
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get(CacheConstants::KEY_CANVAS_PERMS_ALL);
                if ($cached !== null && $cached !== false) return json_decode($cached, true) ?? [];
            } catch (\Throwable $e) {}
        }

        $sql = "SELECT * FROM " . DB::TBL_CANVAS_PERMISSIONS . " ORDER BY id ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $perms = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        if ($this->redisClient && !empty($perms)) {
            try { $this->redisClient->setex(CacheConstants::KEY_CANVAS_PERMS_ALL, CacheConstants::TTL_ONE_DAY, json_encode($perms)); } catch (\Throwable $e) {}
        }

        return $perms;
    }

    public function createCanvasRole(int $canvasId, string $name, array $permissions, int $weight = 10, int $isSystem = 0): int {
        try {
            $uuid = \App\Core\Helpers\Utils::generateUUID();
            $this->db->beginTransaction();
            
            $sql = "INSERT INTO " . DB::TBL_CANVAS_ROLES . " (uuid, canvas_id, name, weight, is_system) 
                    VALUES (:uuid, :canvas_id, :name, :weight, :is_system)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':uuid' => $uuid,
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
            $this->cacheInvalidator->canvasRoles($canvasId);
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
            $this->cacheInvalidator->canvasRoles($canvasId);
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
            
            // Invalidate canvas roles cache
            $stmtCid = $this->db->prepare("SELECT canvas_id FROM " . DB::TBL_CANVAS_ROLES . " WHERE id = ?");
            $stmtCid->execute([$roleId]);
            $canvasId = (int)$stmtCid->fetchColumn();
            $this->cacheInvalidator->canvasRoles($canvasId ?: null);
            
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
        $res = $stmt->execute([
            ':id' => $roleId,
            ':canvas_id' => $canvasId
        ]);
        if ($res) {
            $this->cacheInvalidator->canvasRoles($canvasId);
        }
        return $res;
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
        // Check user:storage cache directly via our own redisClient
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get(CacheConstants::PREFIX_USER_STORAGE . $userId);
                if ($cached !== null && $cached !== false) return (float)$cached;
            } catch (\Throwable $e) {}
        }
        // Fallback: query identity DB directly without instantiating full UserRepository
        try {
            $identityDb = (new DatabaseManager())->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmt = $identityDb->prepare("SELECT storage_used_bytes FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $bytes = (float)$stmt->fetchColumn();
            $mb = $bytes > 0 ? $bytes / (1024 * 1024) : 0.0;
            if ($this->redisClient && $mb > 0) {
                try { $this->redisClient->setex(CacheConstants::PREFIX_USER_STORAGE . $userId, CacheConstants::TTL_FIVE_MINS, (string)$mb); } catch (\Throwable $e) {}
            }
            return $mb;
        } catch (\Throwable $e) {
            Logger::error("getUserStorageUsed fallback failed", ['user_id' => $userId, 'error' => $e->getMessage()]);
            return 0.0;
        }
    }

    public function countCanvasSnapshots(int $canvasId): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " WHERE canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        return (int)$stmt->fetchColumn();
    }

    public function getCanvasByUuid(string $uuid): ?array {
        $cacheKey = CacheConstants::PREFIX_CANVAS_DETAIL . 'uuid:' . $uuid;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached) return json_decode($cached, true);
            } catch (\Throwable $e) {}
        }

        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uuid' => $uuid]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $final = $result ? $this->appendSnapshotUrl($result) : null;

        if ($final && $this->redisClient) {
            try {
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_THIRTY_DAYS, json_encode($final));
            } catch (\Throwable $e) {}
        }

        return $final;
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
                $this->invalidateCanvasCache($canvasId);
            }
            
            $this->db->commit();
            $this->invalidateMemberCache($canvasId, $userId);
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
        $sql = "SELECT s3_key, snapshot_data FROM " . DB::TBL_CANVAS_SNAPSHOTS . " WHERE canvas_id = :canvas_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            // Fallback a Redis si no hay fila en canvas_snapshots
            $redisKey = "canvas:{$canvasId}:state";
            if ($this->redisClient) {
                try {
                    $cached = $this->redisClient->get($redisKey);
                    if ($cached) return $cached;
                } catch (\Throwable $e) {}
            }
            return null;
        }

        $data = null;
        if (!empty($row['s3_key'])) {
            try {
                $s3 = \App\Core\Helpers\Utils::getS3Client();
                $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
                $result = $s3->getObject([
                    'Bucket' => $bucket,
                    'Key'    => $row['s3_key']
                ]);
                $body = (string)$result['Body'];
                if ($body) {
                    $decompressed = @gzuncompress($body);
                    if ($decompressed === false) $decompressed = @gzdecode($body);
                    if ($decompressed === false) $decompressed = @gzinflate($body);
                    $data = ($decompressed !== false) ? $decompressed : $body;
                }
            } catch (\Throwable $e) {
                Logger::error("Failed to fetch active snapshot from S3 for canvas {$canvasId}: " . $e->getMessage());
            }
        }

        if ($data === null && !empty($row['snapshot_data'])) {
            $raw = $row['snapshot_data'];
            $decompressed = @gzuncompress($raw);
            if ($decompressed === false) $decompressed = @gzdecode($raw);
            if ($decompressed === false) $decompressed = @gzinflate($raw);
            $data = ($decompressed !== false) ? $decompressed : $raw;
        }

        return $data;
    }

    public function saveSnapshot(int $canvasId, string $snapshotData): bool {
        $compressed = gzcompress($snapshotData);
        $s3_key = "active_snapshots/canvas_{$canvasId}.bin";
        
        try {
            $s3 = \App\Core\Helpers\Utils::getS3Client();
            $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
            $s3->putObject([
                'Bucket' => $bucket,
                'Key'    => $s3_key,
                'Body'   => $compressed
            ]);
            
            $sql = "INSERT INTO " . DB::TBL_CANVAS_SNAPSHOTS . " (canvas_id, s3_key, snapshot_data) 
                    VALUES (:canvas_id, :s3_key, NULL)
                    ON DUPLICATE KEY UPDATE s3_key = :update_s3_key, snapshot_data = NULL, last_updated = CURRENT_TIMESTAMP";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                ':canvas_id'     => $canvasId,
                ':s3_key'        => $s3_key,
                ':update_s3_key' => $s3_key
            ]);
        } catch (\Throwable $e) {
            Logger::error("Failed to save active snapshot to S3 for canvas {$canvasId}: " . $e->getMessage());
            
            $sql = "INSERT INTO " . DB::TBL_CANVAS_SNAPSHOTS . " (canvas_id, s3_key, snapshot_data) 
                    VALUES (:canvas_id, NULL, :data)
                    ON DUPLICATE KEY UPDATE snapshot_data = :update_data, last_updated = CURRENT_TIMESTAMP";
            
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                ':canvas_id'   => $canvasId,
                ':data'        => $compressed,
                ':update_data' => $compressed
            ]);
        }
    }

    public function clearCanvasData(int $canvasId): bool {
        $sql = "DELETE FROM " . DB::TBL_CANVAS_SNAPSHOTS . " WHERE canvas_id = :canvas_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':canvas_id' => $canvasId]);
    }

    public function getResetSettings(int $canvasId): ?array {
        $cacheKey = CacheConstants::PREFIX_CANVAS_RESET_SETTINGS . $canvasId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return json_decode($cached, true) ?: null;
            } catch (\Throwable $e) {}
        }

        $sql = "SELECT * FROM " . DB::TBL_CANVAS_RESET_SETTINGS . " WHERE canvas_id = :canvas_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        if ($result && $this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($result)); } catch (\Throwable $e) {}
        }

        return $result;
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
        $success = $stmt->execute([
            ':canvas_id'         => $canvasId,
            ':is_active'         => $settings['is_active'],
            ':next_reset_at'     => $settings['next_reset_at'],
            ':take_snapshot'     => $settings['take_snapshot'],
            
            ':upd_is_active'     => $settings['is_active'],
            ':upd_next_reset_at' => $settings['next_reset_at'],
            ':upd_take_snapshot' => $settings['take_snapshot']
        ]);
        if ($success) {
            $this->invalidateCanvasCache($canvasId);
            // Invalidate reset settings cache
            if ($this->redisClient) {
                try { $this->redisClient->del(CacheConstants::PREFIX_CANVAS_RESET_SETTINGS . $canvasId); } catch (\Throwable $e) {}
            }
        }
        return $success;
    }

    public function getResizeSettings(int $canvasId): ?array {
        $cacheKey = CacheConstants::PREFIX_CANVAS_RESIZE_SETTINGS . $canvasId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return json_decode($cached, true) ?: null;
            } catch (\Throwable $e) {}
        }

        $sql = "SELECT * FROM " . DB::TBL_CANVAS_RESIZE_SETTINGS . " WHERE canvas_id = :canvas_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

        if ($result && $this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($result)); } catch (\Throwable $e) {}
        }

        return $result;
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
        $success = $stmt->execute([
            ':canvas_id'         => $canvasId,
            ':is_active'         => $settings['is_active'],
            ':next_resize_at'    => $settings['next_resize_at'],
            ':target_size'       => $settings['target_size'],
            
            ':upd_is_active'     => $settings['is_active'],
            ':upd_next_resize_at'=> $settings['next_resize_at'],
            ':upd_target_size'   => $settings['target_size']
        ]);
        if ($success) {
            $this->invalidateCanvasCache($canvasId);
            // Invalidate resize settings cache
            if ($this->redisClient) {
                try { $this->redisClient->del(CacheConstants::PREFIX_CANVAS_RESIZE_SETTINGS . $canvasId); } catch (\Throwable $e) {}
            }
        }
        return $success;
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
        $cacheKey = CacheConstants::PREFIX_CANVAS_SNAPSHOTS . $canvasId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return json_decode($cached, true) ?? [];
            } catch (\Throwable $e) {}
        }

        $sql = "SELECT * FROM " . DB::TBL_CANVAS_SNAPSHOTS_HISTORY . " 
                WHERE canvas_id = :canvas_id 
                ORDER BY created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        if ($this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($result)); } catch (\Throwable $e) {}
        }

        return $result;
    }

    public function getSnapshotsHistoryByUuid(string $uuid): array {
        $sql = "SELECT h.id, h.snapshot_uuid, h.file_path, h.created_at, h.privacy, 
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

        if ($fileSize > 0 && $insertId) {
            try {
                $identityDb = (new DatabaseManager())->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
                $stmtUpd = $identityDb->prepare("UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes + ?) WHERE id = ?");
                $stmtUpd->execute([$fileSize, $userId]);
                $this->cacheInvalidator->userStorage($userId);
            } catch (\Throwable $e) {
                Logger::error("saveTemplateMetadata: failed to update storage", ['user_id' => $userId, 'error' => $e->getMessage()]);
            }
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

        $sql = "DELETE FROM " . DB::TBL_USER_TEMPLATES . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([':id' => $templateId, ':user_id' => $userId]);

        if ($result && $fileSize > 0) {
            try {
                $identityDb = (new DatabaseManager())->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
                $stmtUpd = $identityDb->prepare("UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - ?) WHERE id = ?");
                $stmtUpd->execute([$fileSize, $userId]);
                $this->cacheInvalidator->userStorage($userId);
            } catch (\Throwable $e) {
                Logger::error("deleteTemplate: failed to update storage", ['user_id' => $userId, 'error' => $e->getMessage()]);
            }
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
            $this->invalidateCanvasCache($canvasId);

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
    public function isMember(int $userId, int $canvasId): bool {
        $stmt = $this->db->prepare("SELECT 1 FROM " . DB::TBL_CANVAS_MEMBERS . " WHERE user_id = :user_id AND canvas_id = :canvas_id LIMIT 1");
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
        $sql = "SELECT i.* FROM " . DB::TBL_CANVAS_INVITES . " i
                WHERE i.canvas_id = :canvas_id
                ORDER BY i.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':canvas_id' => $canvasId]);
        $invites = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        if (empty($invites)) {
            return [];
        }

        $creatorIds = array_unique(array_filter(array_column($invites, 'created_by')));

        if (!empty($creatorIds)) {
            // Fetch usernames directly from identity DB — no full UserRepository instantiation needed
            try {
                $identityDb = (new DatabaseManager())->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
                $ph = implode(',', array_fill(0, count($creatorIds), '?'));
                $stmtU = $identityDb->prepare("SELECT id, username FROM users WHERE id IN ({$ph})");
                $stmtU->execute(array_values($creatorIds));
                $usernames = $stmtU->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
            } catch (\Throwable $e) {
                Logger::error("getInvites: failed to fetch usernames", ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
                $usernames = [];
            }
            foreach ($invites as &$invite) {
                $invite['creator_name'] = $usernames[$invite['created_by']] ?? 'Unknown';
            }
        } else {
            foreach ($invites as &$invite) {
                $invite['creator_name'] = 'Unknown';
            }
        }

        return $invites;
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
        $cacheKey = CacheConstants::PREFIX_CANVAS_WEIGHT . $userId . CacheConstants::INFIX_CANVAS_WEIGHT . $canvasId;
        // Use the already-injected redisClient instead of creating a new instance
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) return (int)$cached;
            } catch (\Throwable $e) {}
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

        if ($this->redisClient) {
            try { $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, (string)$weight); } catch (\Throwable $e) {}
        }

        return $weight;
    }


}
?>
