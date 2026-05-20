<?php
// includes/core/Repositories/UserRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\RoleRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\SecurityConstants;
use PDO;
use PDOException;
use Exception;

class UserRepository implements UserRepositoryInterface {
    private $pdo;
    private $roleRepository;

    public function __construct(DatabaseManager $db, RoleRepositoryInterface $roleRepository) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
        $this->roleRepository = $roleRepository;
    }

    /**
     * OPTIMIZADO: Delegamos la hidratación de roles y permisos al RoleRepository 
     * aprovechando toda la infraestructura de Redis en lugar de consultas SQL nativas.
     */
    private function getUserWithDetails(string $column, $value): ?array {
        $tblUsers = DB::TBL_USERS;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;

        try {
            // 1. Obtener datos base y restricciones (Relación 1 a 1)
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

            // 2. Obtener roles hidratados de forma segura mediante Redis
            $roles = $this->roleRepository->getUserRoles($user['id']);

            if (!empty($roles)) {
                $mainRole = $roles[0];
                $user['role_name'] = $mainRole['name'];
                $user['role_color'] = $mainRole['color'];
                $user['role_weight'] = $mainRole['weight'];
                $user['assigned_roles_ids'] = implode(',', array_column($roles, 'id'));
            } else {
                $user['role_name'] = null;
                $user['role_color'] = null;
                $user['role_weight'] = null;
                $user['assigned_roles_ids'] = null;
            }

            // 3. Obtener permisos consolidados mediante Redis
            $permissionsArray = $this->roleRepository->getMergedPermissionsForUser($user['id']);
            $user['permissions'] = !empty($permissionsArray) ? implode(',', $permissionsArray) : null;

            return $user;

        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['column' => $column, 'value' => $value, 'exception' => $e]);
            return null;
        }
    }

    /**
     * NOTA: Este método se deja con su Eager Loading SQL nativo intencionalmente 
     * ya que es mejor consultar roles en lotes (IN) para listas en el Panel de Administración 
     * que realizar decenas de loops individuales hacia Redis.
     */
    public function getUsersList(int $limit, int $offset): array {
        $tblUsers = DB::TBL_USERS;
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;

        try {
            $stmtUsers = $this->pdo->prepare("
                SELECT u.id, u.uuid, u.username, u.email, u.profile_picture, u.created_at,
                       ur.is_suspended, ur.suspension_type
                FROM {$tblUsers} u
                LEFT JOIN {$tblUserRestr} ur ON u.id = ur.user_id
                ORDER BY u.id DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmtUsers->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmtUsers->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmtUsers->execute();
            
            $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);
            if (empty($users)) return [];

            $userIds = array_column($users, 'id');
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));

            $stmtRoles = $this->pdo->prepare("
                SELECT user_roles.user_id, r.id as role_id, r.name, r.color, r.weight
                FROM {$tblUserRoles} user_roles
                INNER JOIN {$tblRoles} r ON user_roles.role_id = r.id
                WHERE user_roles.user_id IN ($placeholders)
                ORDER BY user_roles.user_id, r.weight DESC
            ");
            $stmtRoles->execute($userIds);
            $rolesData = $stmtRoles->fetchAll(PDO::FETCH_ASSOC);

            $rolesByUser = [];
            foreach ($rolesData as $row) {
                $uid = $row['user_id'];
                if (!isset($rolesByUser[$uid])) $rolesByUser[$uid] = [];
                $rolesByUser[$uid][] = $row;
            }

            foreach ($users as &$user) {
                $uid = $user['id'];
                if (isset($rolesByUser[$uid])) {
                    $mainRole = $rolesByUser[$uid][0];
                    $user['role_name'] = $mainRole['name'];
                    $user['role_color'] = $mainRole['color'];
                    $user['role_weight'] = $mainRole['weight'];
                    $user['assigned_roles_ids'] = implode(',', array_column($rolesByUser[$uid], 'role_id'));
                } else {
                    $user['role_name'] = null;
                    $user['role_color'] = null;
                    $user['role_weight'] = null;
                    $user['assigned_roles_ids'] = null;
                }
            }

            return $users;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['exception' => $e]);
            return [];
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