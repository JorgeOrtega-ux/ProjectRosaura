<?php
// includes/core/Repositories/UserRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\UserRepositoryInterface;
use PDO;

class UserRepository implements UserRepositoryInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function findById(int $id): ?array {
        $stmt = $this->pdo->prepare("
            SELECT u.*, 
                   ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                   ur.deleted_by, ur.deleted_reason, ur.admin_notes 
            FROM users u 
            LEFT JOIN user_restrictions ur ON u.id = ur.user_id 
            WHERE u.id = ?
        ");
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByEmail(string $email): ?array {
        $stmt = $this->pdo->prepare("
            SELECT u.*, 
                   ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                   ur.deleted_by, ur.deleted_reason, ur.admin_notes 
            FROM users u 
            LEFT JOIN user_restrictions ur ON u.id = ur.user_id 
            WHERE u.email = ?
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByUsername(string $username): ?array {
        $stmt = $this->pdo->prepare("
            SELECT u.*, 
                   ur.is_suspended, ur.suspension_type, ur.suspension_reason, ur.suspension_end_date, 
                   ur.deleted_by, ur.deleted_reason, ur.admin_notes 
            FROM users u 
            LEFT JOIN user_restrictions ur ON u.id = ur.user_id 
            WHERE u.username = ?
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function createUser(array $data): int {
        try {
            $this->pdo->beginTransaction();
            
            $stmtUser = $this->pdo->prepare("INSERT INTO users (uuid, username, email, password, role, user_status, profile_picture) VALUES (?, ?, ?, ?, 'user', 'active', ?)");
            $stmtUser->execute([
                $data['uuid'], 
                $data['username'], 
                $data['email'], 
                $data['password'], 
                $data['profile_picture']
            ]);
            $userId = (int) $this->pdo->lastInsertId();

            $stmtRest = $this->pdo->prepare("INSERT INTO user_restrictions (user_id) VALUES (?)");
            $stmtRest->execute([$userId]);

            $this->pdo->commit();
            return $userId;
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            return 0;
        }
    }

    public function liftSuspension(int $id): bool {
        $stmt = $this->pdo->prepare("
            UPDATE user_restrictions 
            SET is_suspended = 0, suspension_type = NULL, suspension_reason = NULL, suspension_end_date = NULL 
            WHERE user_id = ?
        ");
        return $stmt->execute([$id]);
    }

    public function updateAvatar(int $id, string $path): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        return $stmt->execute([$path, $id]);
    }

    public function updateBanner(int $id, string $path): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET banner_path = ? WHERE id = ?");
        return $stmt->execute([$path, $id]);
    }

    // --- NUEVO MÉTODO PARA ACTUALIZAR EL PERFIL DEL CANAL ---
    public function updateChannelProfile(int $id, ?string $description, ?string $identifier, ?string $contactEmail): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET channel_description = ?, channel_identifier = ?, channel_contact_email = ? WHERE id = ?");
        return $stmt->execute([$description, $identifier, $contactEmail, $id]);
    }

    public function updateUsername(int $id, string $username): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
        return $stmt->execute([$username, $id]);
    }

    public function updateEmail(int $id, string $email): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET email = ? WHERE id = ?");
        return $stmt->execute([$email, $id]);
    }

    public function updatePassword(int $id, string $hashedPassword): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        return $stmt->execute([$hashedPassword, $id]);
    }

    public function update2FA(int $id, ?string $secret, int $enabled, ?string $recoveryCodes): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET two_factor_secret = ?, two_factor_enabled = ?, two_factor_recovery_codes = ? WHERE id = ?");
        return $stmt->execute([$secret, $enabled, $recoveryCodes, $id]);
    }

    public function updateRecoveryCodes(int $id, string $recoveryCodes): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET two_factor_recovery_codes = ? WHERE id = ?");
        return $stmt->execute([$recoveryCodes, $id]);
    }

    public function updatePreference(int $userId, string $key, $value): bool {
        $allowedKeys = ['language', 'open_links_new_tab', 'theme', 'extended_alerts'];
        if (!in_array($key, $allowedKeys)) return false;

        $stmt = $this->pdo->prepare("UPDATE user_preferences SET {$key} = ? WHERE user_id = ?");
        return $stmt->execute([$value, $userId]);
    }

    public function updateRole(int $id, string $role): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
        return $stmt->execute([$role, $id]);
    }
}
?>