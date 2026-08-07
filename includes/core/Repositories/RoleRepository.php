<?php

namespace App\Core\Repositories;

use App\Core\Interfaces\RoleRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\CacheConstants;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\SecurityConstants;
use App\Core\System\Logger;
use PDO;
use Exception;

class RoleRepository implements RoleRepositoryInterface {
    private $pdo;
    private $redisCache;
    private $redisClient;

    public function __construct(DatabaseManager $dbManager, RedisCache $redisCache) {
        $this->pdo = $dbManager->getConnection(DB::CONN_IDENTITY);
        $this->redisCache = $redisCache;
        $this->redisClient = $redisCache->getClient();
    }

    public function invalidateGlobalRolesCache(): void {
        if (!$this->redisClient || defined('SYSTEM_DEGRADED')) return;
        $this->redisClient->del([CacheConstants::PREFIX_ROLES_ALL]);
    }

    public function invalidateRoleCache(int $roleId): void {
        if (!$this->redisClient || defined('SYSTEM_DEGRADED')) return;
        $role = $this->findById($roleId);
        
        $keysToDelete = [
            CacheConstants::PREFIX_ROLE_BY_ID . $roleId,
            CacheConstants::PREFIX_ROLE_PERMS . $roleId,
            CacheConstants::PREFIX_ROLES_ALL
        ];

        if ($role) {
            $keysToDelete[] = CacheConstants::PREFIX_ROLE_BY_NAME . md5($role['name']);
        }

        $this->redisClient->del($keysToDelete);
        $this->redisClient->setex(CacheConstants::PREFIX_FORCE_REAUTH_ROLE . $roleId, CacheConstants::TTL_ONE_DAY, time());
    }

    public function invalidateUserCache(int $userId): void {
        if (!$this->redisClient || defined('SYSTEM_DEGRADED')) return;
        
        $this->redisClient->del([
            CacheConstants::PREFIX_USER_ROLES . $userId,
            CacheConstants::PREFIX_USER_PERMS . $userId,
            CacheConstants::PREFIX_USER_HIGHEST_ROLE . $userId
        ]);
        $this->redisClient->setex(CacheConstants::PREFIX_FORCE_REAUTH_USER . $userId, CacheConstants::TTL_ONE_DAY, time());
    }

    public function invalidateGlobalPermissionsCache(): void {
        if (!$this->redisClient || defined('SYSTEM_DEGRADED')) return;
        $this->redisClient->del([CacheConstants::PREFIX_ALL_PERMISSIONS]);
    }

    public function getAll(): array {
        $cacheKey = CacheConstants::PREFIX_ROLES_ALL;
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_all_roles', 5, function() use ($cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblRoles = DB::TBL_ROLES;
            $stmt = $this->pdo->query("SELECT id, uuid, name, weight, is_system, created_at, updated_at FROM {$tblRoles} ORDER BY weight DESC, id ASC");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($data));
            return $data;
        });
    }

    public function findById(int $id): ?array {
        $cacheKey = CacheConstants::PREFIX_ROLE_BY_ID . $id;
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_role_' . $id, 5, function() use ($id, $cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblRoles = DB::TBL_ROLES;
            $stmt = $this->pdo->prepare("SELECT id, uuid, name, weight, is_system, created_at, updated_at FROM {$tblRoles} WHERE id = ? LIMIT 1");
            $stmt->execute([$id]);
            $role = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($role && $this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($role));
            return $role ?: null;
        });
    }

    public function findByUuid(string $uuid): ?array {
        $cacheKey = CacheConstants::PREFIX_ROLE_BY_ID . 'uuid_' . md5($uuid);
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_role_uuid_' . md5($uuid), 5, function() use ($uuid, $cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblRoles = DB::TBL_ROLES;
            $stmt = $this->pdo->prepare("SELECT id, uuid, name, weight, is_system, created_at, updated_at FROM {$tblRoles} WHERE uuid = ? LIMIT 1");
            $stmt->execute([$uuid]);
            $role = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($role && $this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($role));
            return $role ?: null;
        });
    }

    public function findByName(string $name): ?array {
        $cacheKey = CacheConstants::PREFIX_ROLE_BY_NAME . md5($name);
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_role_name_' . md5($name), 5, function() use ($name, $cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblRoles = DB::TBL_ROLES;
            $stmt = $this->pdo->prepare("SELECT id, uuid, name, weight, is_system, created_at, updated_at FROM {$tblRoles} WHERE name = ? LIMIT 1");
            $stmt->execute([$name]);
            $role = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($role && $this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($role));
            return $role ?: null;
        });
    }

    public function getAllPermissions(): array {
        $cacheKey = CacheConstants::PREFIX_ALL_PERMISSIONS;
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_all_perms', 5, function() use ($cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblPerms = DB::TBL_PERMISSIONS;
            $stmt = $this->pdo->query("SELECT id, name, description, is_critical FROM {$tblPerms} ORDER BY id ASC");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_WEEK, json_encode($data));
            return $data;
        });
    }

    public function getRolePermissions(int $roleId): array {
        $cacheKey = CacheConstants::PREFIX_ROLE_PERMS . $roleId;
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_role_perms_' . $roleId, 5, function() use ($roleId, $cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblPerms = DB::TBL_PERMISSIONS;
            $tblRolePerms = DB::TBL_ROLE_PERMISSIONS;

            $stmt = $this->pdo->prepare("
                SELECT p.id, p.name, p.description, p.is_critical 
                FROM {$tblPerms} p
                INNER JOIN {$tblRolePerms} rp ON p.id = rp.permission_id
                WHERE rp.role_id = ?
            ");
            $stmt->execute([$roleId]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($data));
            return $data;
        });
    }

    public function getValidPermissionIds(array $ids): array {
        if (empty($ids)) return [];
        $allPerms = $this->getAllPermissions(); 
        $validIds = array_column($allPerms, 'id');
        return array_values(array_intersect($ids, $validIds));
    }

    public function getUserRoles(int $userId): array {
        $cacheKey = CacheConstants::PREFIX_USER_ROLES . $userId;
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_user_roles_' . $userId, 5, function() use ($userId, $cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblRoles = DB::TBL_ROLES;
            $tblUserRoles = DB::TBL_USER_ROLES;

            $stmt = $this->pdo->prepare("
                SELECT r.id, r.uuid, r.name, r.weight 
                FROM {$tblRoles} r 
                INNER JOIN {$tblUserRoles} ur ON r.id = ur.role_id 
                WHERE ur.user_id = ? 
                ORDER BY r.weight DESC
            ");
            $stmt->execute([$userId]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($data));
            return $data;
        });
    }

    public function getMergedPermissionsForUser(int $userId): array {
        $cacheKey = CacheConstants::PREFIX_USER_PERMS . $userId;
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_user_perms_' . $userId, 5, function() use ($userId, $cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblPerms = DB::TBL_PERMISSIONS;
            $tblRolePerms = DB::TBL_ROLE_PERMISSIONS;
            $tblUserRoles = DB::TBL_USER_ROLES;

            $stmt = $this->pdo->prepare("
                SELECT DISTINCT p.name 
                FROM {$tblPerms} p
                INNER JOIN {$tblRolePerms} rp ON p.id = rp.permission_id
                INNER JOIN {$tblUserRoles} ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = ?
            ");
            $stmt->execute([$userId]);
            $data = $stmt->fetchAll(PDO::FETCH_COLUMN);

            if ($this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($data));
            return $data;
        });
    }

    public function getHighestPriorityRole(int $userId): ?array {
        $cacheKey = CacheConstants::PREFIX_USER_HIGHEST_ROLE . $userId;
        $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
        if ($cached) return json_decode($cached, true);

        return $this->redisCache->executeWithLock('lock_rbac_user_highrole_' . $userId, 5, function() use ($userId, $cacheKey) {
            $cached = $this->redisClient ? $this->redisClient->get($cacheKey) : null;
            if ($cached) return json_decode($cached, true);

            $tblRoles = DB::TBL_ROLES;
            $tblUserRoles = DB::TBL_USER_ROLES;

            $stmt = $this->pdo->prepare("
                SELECT r.id, r.uuid, r.name, r.weight 
                FROM {$tblRoles} r 
                INNER JOIN {$tblUserRoles} ur ON r.id = ur.role_id 
                WHERE ur.user_id = ? 
                ORDER BY r.weight DESC LIMIT 1
            ");
            $stmt->execute([$userId]);
            $role = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($role && $this->redisClient) $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, json_encode($role));
            return $role ?: null;
        });
    }

    public function create(string $name, int $weight = 1): bool {
        $tblRoles = DB::TBL_ROLES;
        try {
            $uuid = \App\Core\Helpers\Utils::generateUUID();
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare("INSERT INTO {$tblRoles} (uuid, name, weight) VALUES (?, ?, ?)");
            $stmt->execute([$uuid, $name, $weight]);
            $this->pdo->commit();
            $this->invalidateGlobalRolesCache();

            return true;
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            Logger::error("Error in RoleRepository::create", ['exception' => $e]);
            return false;
        }
    }

    public function update(int $id, string $name, int $weight, int $executorWeight): bool {
        $tblRoles = DB::TBL_ROLES;
        try {
            $stmtRole = $this->pdo->prepare("SELECT weight, is_system FROM {$tblRoles} WHERE id = ?");
            $stmtRole->execute([$id]);
            $role = $stmtRole->fetch(PDO::FETCH_ASSOC);

            if (!$role) return false;
            
            if ($executorWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && (int)$role['weight'] >= $executorWeight) {
                return false; 
            }
            if ($executorWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && $weight > $executorWeight) {
                return false;
            }

            $this->pdo->beginTransaction();
            if ($role['is_system'] == 1) {
                // System role: weight cannot be changed by non-superadmins
                $stmt = $this->pdo->prepare("UPDATE {$tblRoles} SET weight = ? WHERE id = ?");
                $stmt->execute([$weight, $id]);
            } else {
                $stmt = $this->pdo->prepare("UPDATE {$tblRoles} SET name = ?, weight = ? WHERE id = ?");
                $stmt->execute([$name, $weight, $id]);
            }
            $this->pdo->commit();
            $this->invalidateRoleCache($id);

            return true;
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            Logger::error("Error in RoleRepository::update", ['exception' => $e]);
            return false;
        }
    }

    public function delete(int $id, int $executorWeight): bool {
        $role = $this->findById($id);
        if (!$role) return false;

        $tblRoles = DB::TBL_ROLES;

        if ((int)$role['is_system'] === 1) {
            throw new Exception("Security Violation: Attempted to delete a fundamental system role.");
        }

        if ($executorWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && (int)$role['weight'] >= $executorWeight) {
            throw new Exception("Security Violation: Attempted to delete a role of equal or higher hierarchy.");
        }

        try {
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare("DELETE FROM {$tblRoles} WHERE id = ?");
            $stmt->execute([$id]);
            $this->pdo->commit();
            $this->invalidateRoleCache($id);

            return true;
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            Logger::error("Error in RoleRepository::delete", ['exception' => $e]);
            return false;
        }
    }

    public function assignPermissionsToRole(int $roleId, array $permissionsArray, int $executorWeight): bool {
        $role = $this->findById($roleId);
        if (!$role) return false;

        if ($executorWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && (int)$role['weight'] >= $executorWeight) {
            throw new Exception("Security Violation: Attempted to modify permissions of a role of equal or higher hierarchy.");
        }

        $tblRolePerms = DB::TBL_ROLE_PERMISSIONS;

        try {
            $this->pdo->beginTransaction();

            $deleteStmt = $this->pdo->prepare("DELETE FROM {$tblRolePerms} WHERE role_id = ?");
            $deleteStmt->execute([$roleId]);

            $validPermissions = $this->getValidPermissionIds($permissionsArray);

            if (!empty($validPermissions)) {
                $placeholders = implode(',', array_fill(0, count($validPermissions), '(?, ?)'));
                $values = [];
                foreach ($validPermissions as $permissionId) {
                    $values[] = $roleId;
                    $values[] = $permissionId;
                }
                $insertStmt = $this->pdo->prepare("INSERT INTO {$tblRolePerms} (role_id, permission_id) VALUES {$placeholders}");
                $insertStmt->execute($values);
            }

            $tblUserRoles = DB::TBL_USER_ROLES;
            $userStmt = $this->pdo->prepare("SELECT user_id FROM {$tblUserRoles} WHERE role_id = ?");
            $userStmt->execute([$roleId]);
            $affectedUsers = $userStmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($affectedUsers as $uid) {
                $this->invalidateUserCache($uid);
            }

            $this->pdo->commit();
            $this->invalidateRoleCache($roleId);

            return true;
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            Logger::error("Error in assignPermissionsToRole", ['exception' => $e]);
            return false;
        }
    }

    public function syncUserRoles(int $userId, array $roleIds, int $executorWeight): bool {
        if (!in_array(SecurityConstants::DEFAULT_USER_ROLE_ID, $roleIds)) {
            $roleIds[] = SecurityConstants::DEFAULT_USER_ROLE_ID;
        }

        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;

        $inQuery = implode(',', array_fill(0, count($roleIds), '?'));
        $stmt = $this->pdo->prepare("SELECT id, weight FROM {$tblRoles} WHERE id IN ($inQuery)");
        $stmt->execute($roleIds);
        $rolesData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rolesData as $rd) {
            if ($executorWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && (int)$rd['weight'] > $executorWeight) {
                throw new Exception("Security Violation: Insufficient hierarchy to assign role ID " . $rd['id']);
            }
        }

        try {
            $this->pdo->beginTransaction();

            $delStmt = $this->pdo->prepare("DELETE FROM {$tblUserRoles} WHERE user_id = ?");
            $delStmt->execute([$userId]);

            if (!empty($rolesData)) {
                $placeholders = implode(',', array_fill(0, count($rolesData), '(?, ?)'));
                $values = [];
                foreach ($rolesData as $rd) {
                    $values[] = $userId;
                    $values[] = $rd['id'];
                }
                $insStmt = $this->pdo->prepare("INSERT INTO {$tblUserRoles} (user_id, role_id) VALUES {$placeholders}");
                $insStmt->execute($values);
            }
            $this->pdo->commit();
            $this->invalidateUserCache($userId);

            return true;
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            Logger::error("Error in syncUserRoles", ['exception' => $e]);
            return false;
        }
    }
}
?>