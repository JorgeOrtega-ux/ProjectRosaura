<?php
// includes/core/Repositories/ProfileLogRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\ProfileLogRepositoryInterface;
use PDO;

class ProfileLogRepository implements ProfileLogRepositoryInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function countRecentChanges(int $userId, string $changeType, int $days): int {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM profile_changes_log WHERE user_id = ? AND change_type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
        $stmt->execute([$userId, $changeType, $days]);
        return (int) $stmt->fetchColumn();
    }

    public function logChange(int $userId, string $changeType, ?string $oldValue, ?string $newValue, string $ipAddress): bool {
        $stmt = $this->pdo->prepare("INSERT INTO profile_changes_log (user_id, change_type, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?)");
        return $stmt->execute([$userId, $changeType, $oldValue, $newValue, $ipAddress]);
    }
}
?>