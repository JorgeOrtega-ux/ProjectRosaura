<?php
// includes/core/Repositories/UserRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\UserRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\SecurityConstants;
use PDO;
use PDOException;
use Exception;

class UserRepository implements UserRepositoryInterface {
    private $pdo;

    public function __construct(DatabaseManager $db) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
    }

    /**
     * MÉTODO PRIVADO DRY: Evita el producto cartesiano masivo de JOINs al separar
     * la obtención de datos base del usuario, sus roles y sus permisos.
     */
    private function getUserWithDetails(string $column, $value): ?array {
        $tblUsers = DB::TBL_USERS;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;

        try {
            // 1. Obtener datos base y restricciones (Relación 1 a 1, rápido y directo)
            $stmtUser = $this->pdo->prepare("
                SELECT 
                    u.id, u.uuid, u.username, u.email, u.password, u.profile_picture, 
                    u.two_factor_secret, u.two_factor_enabled, u.two_factor_recovery_codes, u.deletion_scheduled_at, u.created_at,
                    ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                    ur.deleted_by, ur.deleted_reason, ur.admin_notes
                FROM {$tblUsers} u 
                LEFT JOIN {$tblUserRestr} ur ON u.id = ur.user_id 
                WHERE u.{$column} = ?
                LIMIT 1
            ");
            $stmtUser->execute([$value]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            if (!$user) return null;

            // 2. Obtener roles principales (Evita multiplicar filas con permisos)
            $tblRoles = DB::TBL_ROLES;
            $tblUserRoles = DB::TBL_USER_ROLES;
            
            $stmtRoles = $this->pdo->prepare("
                SELECT 
                    SUBSTRING_INDEX(GROUP_CONCAT(r.name ORDER BY r.weight DESC SEPARATOR '|||'), '|||', 1) as role_name,
                    SUBSTRING_INDEX(GROUP_CONCAT(r.color ORDER BY r.weight DESC SEPARATOR '|||'), '|||', 1) as role_color,
                    CAST(SUBSTRING_INDEX(GROUP_CONCAT(r.weight ORDER BY r.weight DESC SEPARATOR '|||'), '|||', 1) AS UNSIGNED) as role_weight,
                    GROUP_CONCAT(r.id) as assigned_roles_ids
                FROM {$tblRoles} r
                INNER JOIN {$tblUserRoles} ur ON r.id = ur.role_id
                WHERE ur.user_id = ?
            ");
            $stmtRoles->execute([$user['id']]);
            $rolesData = $stmtRoles->fetch(PDO::FETCH_ASSOC);

            if ($rolesData) {
                $user['role_name'] = $rolesData['role_name'];
                $user['role_color'] = $rolesData['role_color'];
                $user['role_weight'] = $rolesData['role_weight'];
                $user['assigned_roles_ids'] = $rolesData['assigned_roles_ids'];
            }

            // 3. Obtener permisos combinados y únicos
            $tblRolePerms = DB::TBL_ROLE_PERMISSIONS;
            $tblPerms = DB::TBL_PERMISSIONS;

            $stmtPerms = $this->pdo->prepare("
                SELECT GROUP_CONCAT(DISTINCT p.name) as permissions
                FROM {$tblPerms} p
                INNER JOIN {$tblRolePerms} rp ON p.id = rp.permission_id
                INNER JOIN {$tblUserRoles} ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = ?
            ");
            $stmtPerms->execute([$user['id']]);
            $permsData = $stmtPerms->fetch(PDO::FETCH_ASSOC);

            $user['permissions'] = $permsData ? $permsData['permissions'] : null;

            return $user;

        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['column' => $column, 'value' => $value, 'exception' => $e]);
            return null;
        }
    }

    public function findById(int $id): ?array {
        return $this->getUserWithDetails('id', $id);
    }

    public function findByEmail(string $email): ?array {
        return $this->getUserWithDetails('email', $email);
    }

    public function findByUsername(string $username): ?array {
        $tblUsers = DB::TBL_USERS;
        try {
            // Se añade LIMIT 1 para detener el escaneo en cuanto encuentre coincidencia
            $stmt = $this->pdo->prepare("SELECT id FROM {$tblUsers} WHERE username = ? LIMIT 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            return $user ?: null;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['username' => $username, 'exception' => $e]);
            return null;
        }
    }

    public function createUser(array $data): int {
        $tblUsers = DB::TBL_USERS;
        $tblUserRoles = DB::TBL_USER_ROLES;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;

        try {
            $this->pdo->beginTransaction();
            
            $stmtUser = $this->pdo->prepare("INSERT INTO {$tblUsers} (uuid, username, email, password, profile_picture) VALUES (?, ?, ?, ?, ?)");
            $stmtUser->execute([
                $data['uuid'], 
                $data['username'], 
                $data['email'], 
                $data['password'], 
                $data['profile_picture']
            ]);
            $userId = (int) $this->pdo->lastInsertId();

            $rolesToAssign = isset($data['roles']) && is_array($data['roles']) ? $data['roles'] : [SecurityConstants::DEFAULT_USER_ROLE_ID];
            if (!in_array(SecurityConstants::DEFAULT_USER_ROLE_ID, $rolesToAssign)) $rolesToAssign[] = SecurityConstants::DEFAULT_USER_ROLE_ID;

            // Optimización: BULK INSERT para roles (Evita viajes de ida y vuelta a la DB)
            $placeholders = implode(',', array_fill(0, count($rolesToAssign), '(?, ?)'));
            $values = [];
            foreach ($rolesToAssign as $roleId) {
                $values[] = $userId;
                $values[] = (int)$roleId;
            }
            $stmtRole = $this->pdo->prepare("INSERT INTO {$tblUserRoles} (user_id, role_id) VALUES {$placeholders}");
            $stmtRole->execute($values);

            $stmtRest = $this->pdo->prepare("INSERT INTO {$tblUserRestr} (user_id) VALUES (?)");
            $stmtRest->execute([$userId]);

            $this->pdo->commit();
            return $userId;
        } catch (Exception $e) { 
            $this->pdo->rollBack();
            Logger::error("Database error in " . __METHOD__, ['email' => $data['email'], 'username' => $data['username'], 'exception' => $e]);
            return 0;
        }
    }

    public function liftSuspension(int $id): bool {
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;
        try {
            $stmt = $this->pdo->prepare("
                UPDATE {$tblUserRestr} 
                SET is_suspended = 0, suspension_type = NULL, suspension_reason = NULL, suspension_end_date = NULL 
                WHERE user_id = ?
            ");
            return $stmt->execute([$id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    public function updateAvatar(int $id, string $path): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET profile_picture = ? WHERE id = ?");
            return $stmt->execute([$path, $id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'path' => $path, 'exception' => $e]);
            return false;
        }
    }

    public function updateUsername(int $id, string $username): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET username = ? WHERE id = ?");
            return $stmt->execute([$username, $id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'username' => $username, 'exception' => $e]);
            return false;
        }
    }

    public function updateEmail(int $id, string $email): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET email = ? WHERE id = ?");
            return $stmt->execute([$email, $id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'email' => $email, 'exception' => $e]);
            return false;
        }
    }

    public function updatePassword(int $id, string $hashedPassword): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET password = ? WHERE id = ?");
            return $stmt->execute([$hashedPassword, $id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    public function update2FA(int $id, ?string $secret, int $enabled, ?string $recoveryCodes): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET two_factor_secret = ?, two_factor_enabled = ?, two_factor_recovery_codes = ? WHERE id = ?");
            return $stmt->execute([$secret, $enabled, $recoveryCodes, $id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'enabled' => $enabled, 'exception' => $e]);
            return false;
        }
    }

    public function updateRecoveryCodes(int $id, string $recoveryCodes): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET two_factor_recovery_codes = ? WHERE id = ?");
            return $stmt->execute([$recoveryCodes, $id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    public function updatePreference(int $userId, string $key, $value): bool {
        if (!in_array($key, DB::ALLOWED_PREF_KEYS)) return false;

        $tblUserPrefs = DB::TBL_USER_PREFERENCES;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUserPrefs} SET {$key} = ? WHERE user_id = ?");
            return $stmt->execute([$value, $userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'key' => $key, 'value' => $value, 'exception' => $e]);
            return false;
        }
    }

    public function scheduleDeletion(int $userId, string $date): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET deletion_scheduled_at = ? WHERE id = ?");
            return $stmt->execute([$date, $userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'date' => $date, 'exception' => $e]);
            return false;
        }
    }

    public function cancelDeletion(int $userId): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("UPDATE {$tblUsers} SET deletion_scheduled_at = NULL WHERE id = ?");
            return $stmt->execute([$userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function deleteUserHard(int $userId): bool {
        $tblUsers = DB::TBL_USERS;
        try {
            $stmt = $this->pdo->prepare("DELETE FROM {$tblUsers} WHERE id = ?");
            return $stmt->execute([$userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }
}
?>