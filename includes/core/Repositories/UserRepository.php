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
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByEmail(string $email): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function findByUsername(string $username): ?array {
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    public function createUser(array $data): int {
        $stmt = $this->pdo->prepare("INSERT INTO users (uuid, username, email, password, role, user_status, is_suspended, profile_picture) VALUES (?, ?, ?, ?, 'user', 'active', 0, ?)");
        $stmt->execute([
            $data['uuid'], 
            $data['username'], 
            $data['email'], 
            $data['password'], 
            $data['profile_picture']
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function updateStatus(int $id, string $status, ?string $deletedBy, ?string $deletedReason, int $isSuspended, ?string $suspensionType, ?string $suspensionReason, ?string $endDate): bool {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET user_status = ?, deleted_by = ?, deleted_reason = ?, 
                is_suspended = ?, suspension_type = ?, suspension_reason = ?, suspension_end_date = ? 
            WHERE id = ?
        ");
        return $stmt->execute([$status, $deletedBy, $deletedReason, $isSuspended, $suspensionType, $suspensionReason, $endDate, $id]);
    }

    public function liftSuspension(int $id): bool {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET is_suspended = 0, suspension_type = NULL, suspension_reason = NULL, suspension_end_date = NULL 
            WHERE id = ?
        ");
        return $stmt->execute([$id]);
    }

    public function updateAvatar(int $id, string $path): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET profile_picture = ? WHERE id = ?");
        return $stmt->execute([$path, $id]);
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