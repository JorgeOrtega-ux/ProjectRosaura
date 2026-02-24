<?php
// includes/core/Repositories/TokenRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\TokenRepositoryInterface;
use PDO;

class TokenRepository implements TokenRepositoryInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function createToken(int $userId, string $selector, string $hashedValidator, string $expiresAt, string $userAgent, string $ipAddress): bool {
        $stmt = $this->pdo->prepare("INSERT INTO auth_tokens (user_id, selector, hashed_validator, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
        return $stmt->execute([$userId, $selector, $hashedValidator, $expiresAt, $userAgent, $ipAddress]);
    }

    public function findValidTokenBySelectorAndUserId(string $selector, int $userId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT t.id, t.hashed_validator 
            FROM auth_tokens t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.selector = ? AND t.user_id = ? AND t.expires_at > NOW() AND u.user_status = 'active'
        ");
        $stmt->execute([$selector, $userId]);
        $token = $stmt->fetch(PDO::FETCH_ASSOC);
        return $token ?: null;
    }

    public function findValidTokenBySelector(string $selector): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM auth_tokens WHERE selector = ? AND expires_at > NOW()");
        $stmt->execute([$selector]);
        $token = $stmt->fetch(PDO::FETCH_ASSOC);
        return $token ?: null;
    }

    public function deleteBySelector(string $selector): bool {
        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE selector = ?");
        return $stmt->execute([$selector]);
    }

    public function deleteAllByUserId(int $userId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ?");
        return $stmt->execute([$userId]);
    }

    public function deleteById(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getActiveDevicesByUserId(int $userId): array {
        $stmt = $this->pdo->prepare("SELECT id, user_agent, ip_address, expires_at, selector FROM auth_tokens WHERE user_id = ? ORDER BY expires_at DESC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function revokeDevice(int $tokenId, int $userId): bool {
        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE id = ? AND user_id = ?");
        return $stmt->execute([$tokenId, $userId]);
    }

    public function revokeOtherDevices(int $userId, string $currentSelector): bool {
        $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ? AND selector != ?");
        return $stmt->execute([$userId, $currentSelector]);
    }
}
?>