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
        $stmt = $this->pdo->prepare("INSERT INTO users (uuid, username, email, password, role, user_status, profile_picture) VALUES (?, ?, ?, ?, 'user', 'active', ?)");
        $stmt->execute([
            $data['uuid'], 
            $data['username'], 
            $data['email'], 
            $data['password'], 
            $data['profile_picture']
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function updateStatus(int $id, string $status): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET user_status = ? WHERE id = ?");
        return $stmt->execute([$status, $id]);
    }
}
?>