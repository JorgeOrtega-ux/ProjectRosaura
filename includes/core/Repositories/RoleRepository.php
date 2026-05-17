<?php
// includes/core/Repositories/RoleRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\RoleRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\SecurityConstants;
use PDO;
use Exception;

class RoleRepository implements RoleRepositoryInterface {
    private $pdo;

    public function __construct(DatabaseManager $dbManager) {
        $this->pdo = $dbManager->getConnection(DB::CONN_IDENTITY);
    }

    public function getAll(): array {
        $tblRoles = DB::TBL_ROLES;
        $stmt = $this->pdo->query("SELECT id, name, color, weight, is_system, created_at, updated_at FROM {$tblRoles} ORDER BY weight DESC, id ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById(int $id): ?array {
        $tblRoles = DB::TBL_ROLES;
        $stmt = $this->pdo->prepare("SELECT * FROM {$tblRoles} WHERE id = ?");
        $stmt->execute([$id]);
        $role = $stmt->fetch(PDO::FETCH_ASSOC);
        return $role ?: null;
    }

    public function findByName(string $name): ?array {
        $tblRoles = DB::TBL_ROLES;
        $stmt = $this->pdo->prepare("SELECT * FROM {$tblRoles} WHERE name = ?");
        $stmt->execute([$name]);
        $role = $stmt->fetch(PDO::FETCH_ASSOC);
        return $role ?: null;
    }

    public function create(string $name, string $colorJson, int $weight = 1): bool {
        $tblRoles = DB::TBL_ROLES;
        $stmt = $this->pdo->prepare("INSERT INTO {$tblRoles} (name, color, weight) VALUES (?, ?, ?)");
        return $stmt->execute([$name, $colorJson, $weight]);
    }

    public function update(int $id, string $name, string $colorJson, int $weight, int $executorWeight): bool {
        $role = $this->findById($id);
        if (!$role) return false;

        $tblRoles = DB::TBL_ROLES;

        // TECHO DE CRISTAL
        if ($executorWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && (int)$role['weight'] >= $executorWeight) {
            throw new Exception("Security Violation: Intento de modificar un rol de jerarquía superior o igual.");
        }

        // INMUTABILIDAD DEL SISTEMA
        if ((int)$role['is_system'] === 1) {
            $stmt = $this->pdo->prepare("UPDATE {$tblRoles} SET color = ? WHERE id = ?");
            return $stmt->execute([$colorJson, $id]);
        }

        $stmt = $this->pdo->prepare("UPDATE {$tblRoles} SET name = ?, color = ?, weight = ? WHERE id = ?");
        return $stmt->execute([$name, $colorJson, $weight, $id]);
    }

    public function delete(int $id, int $executorWeight): bool {
        $role = $this->findById($id);
        if (!$role) return false;

        $tblRoles = DB::TBL_ROLES;

        if ((int)$role['is_system'] === 1) {
            throw new Exception("Security Violation: Intento de eliminar un rol fundamental del sistema.");
        }

        if ($executorWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && (int)$role['weight'] >= $executorWeight) {
            throw new Exception("Security Violation: Intento de eliminar un rol de jerarquía superior o igual.");
        }

        $stmt = $this->pdo->prepare("DELETE FROM {$tblRoles} WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // --- MÉTODOS DE PERMISOS GLOBALES ---

    public function getAllPermissions(): array {
        $tblPerms = DB::TBL_PERMISSIONS;
        $stmt = $this->pdo->query("SELECT id, name, description, is_critical FROM {$tblPerms} ORDER BY id ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getRolePermissions(int $roleId): array {
        $tblPerms = DB::TBL_PERMISSIONS;
        $tblRolePerms = DB::TBL_ROLE_PERMISSIONS;

        $stmt = $this->pdo->prepare("
            SELECT p.id, p.name, p.description, p.is_critical 
            FROM {$tblPerms} p
            INNER JOIN {$tblRolePerms} rp ON p.id = rp.permission_id
            WHERE rp.role_id = ?
        ");
        $stmt->execute([$roleId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getValidPermissionIds(array $ids): array {
        if (empty($ids)) return [];
        $tblPerms = DB::TBL_PERMISSIONS;
        $inQuery = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->pdo->prepare("SELECT id FROM {$tblPerms} WHERE id IN ($inQuery)");
        $stmt->execute($ids);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function assignPermissionsToRole(int $roleId, array $permissionsArray, int $executorWeight): bool {
        $role = $this->findById($roleId);
        if (!$role) return false;

        if ($executorWeight < SecurityConstants::WEIGHT_SUPER_ADMIN && (int)$role['weight'] >= $executorWeight) {
            throw new Exception("Security Violation: Intento de modificar permisos de un rol de jerarquía superior o igual.");
        }

        $tblRolePerms = DB::TBL_ROLE_PERMISSIONS;

        try {
            $this->pdo->beginTransaction();

            $deleteStmt = $this->pdo->prepare("DELETE FROM {$tblRolePerms} WHERE role_id = ?");
            $deleteStmt->execute([$roleId]);

            $validPermissions = $this->getValidPermissionIds($permissionsArray);

            if (!empty($validPermissions)) {
                $insertStmt = $this->pdo->prepare("INSERT INTO {$tblRolePerms} (role_id, permission_id) VALUES (?, ?)");
                foreach ($validPermissions as $permissionId) {
                    $insertStmt->execute([$roleId, $permissionId]);
                }
            }

            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Error in assignPermissionsToRole: " . $e->getMessage());
            return false;
        }
    }

    // --- NUEVO: MÉTODOS MULTI-ROLE ---

    public function syncUserRoles(int $userId, array $roleIds, int $executorWeight): bool {
        // También refactorizado este hardcode 1 que existía previamente
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
                throw new Exception("Security Violation: No tienes jerarquía suficiente para asignar el rol ID " . $rd['id']);
            }
        }

        try {
            $this->pdo->beginTransaction();

            $delStmt = $this->pdo->prepare("DELETE FROM {$tblUserRoles} WHERE user_id = ?");
            $delStmt->execute([$userId]);

            $insStmt = $this->pdo->prepare("INSERT INTO {$tblUserRoles} (user_id, role_id) VALUES (?, ?)");
            foreach ($rolesData as $rd) {
                $insStmt->execute([$userId, $rd['id']]);
            }

            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Error in syncUserRoles: " . $e->getMessage());
            return false;
        }
    }

    public function getUserRoles(int $userId): array {
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;

        $stmt = $this->pdo->prepare("
            SELECT r.id, r.name, r.color, r.weight 
            FROM {$tblRoles} r 
            INNER JOIN {$tblUserRoles} ur ON r.id = ur.role_id 
            WHERE ur.user_id = ? 
            ORDER BY r.weight DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getMergedPermissionsForUser(int $userId): array {
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
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function getHighestPriorityRole(int $userId): ?array {
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;

        $stmt = $this->pdo->prepare("
            SELECT r.id, r.name, r.color, r.weight 
            FROM {$tblRoles} r 
            INNER JOIN {$tblUserRoles} ur ON r.id = ur.role_id 
            WHERE ur.user_id = ? 
            ORDER BY r.weight DESC LIMIT 1
        ");
        $stmt->execute([$userId]);
        $role = $stmt->fetch(PDO::FETCH_ASSOC);
        return $role ?: null;
    }
}
?>