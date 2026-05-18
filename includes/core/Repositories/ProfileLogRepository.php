<?php
// includes/core/Repositories/ProfileLogRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\ProfileLogRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;
use PDOException;

class ProfileLogRepository implements ProfileLogRepositoryInterface {
    private $pdo;

    public function __construct(DatabaseManager $db) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
    }

    public function countRecentChanges(int $userId, string $changeType, int $days): int {
        $tblProfileLog = DB::TBL_PROFILE_CHANGES_LOG;

        try {
            $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM {$tblProfileLog} WHERE user_id = ? AND change_type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
            $stmt->execute([$userId, $changeType, $days]);
            return (int) $stmt->fetchColumn();
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'change_type' => $changeType, 'exception' => $e]);
            return 0; 
        }
    }

    // NUEVO: Requerido para calcular el total de páginas
    public function countAllLogsByUserId(int $userId): int {
        $tblProfileLog = DB::TBL_PROFILE_CHANGES_LOG;
        try {
            $stmt = $this->pdo->prepare("SELECT COUNT(id) FROM {$tblProfileLog} WHERE user_id = ?");
            $stmt->execute([$userId]);
            return (int) $stmt->fetchColumn();
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return 0;
        }
    }

    public function logChange(int $userId, string $changeType, ?string $oldValue, ?string $newValue, string $ipAddress): bool {
        $tblProfileLog = DB::TBL_PROFILE_CHANGES_LOG;

        try {
            $stmt = $this->pdo->prepare("INSERT INTO {$tblProfileLog} (user_id, change_type, old_value, new_value, ip_address) VALUES (?, ?, ?, ?, ?)");
            return $stmt->execute([$userId, $changeType, $oldValue, $newValue, $ipAddress]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'change_type' => $changeType, 'exception' => $e]);
            return false;
        }
    }

    // OPTIMIZADO: Ahora acepta limit y offset nativos para integrarse con la paginación
    public function getLogsByUserId(int $userId, int $limit = 50, int $offset = 0): array {
        $tblProfileLog = DB::TBL_PROFILE_CHANGES_LOG;

        try {
            $stmt = $this->pdo->prepare("
                SELECT id, change_type, old_value, new_value, ip_address, created_at 
                FROM {$tblProfileLog} 
                WHERE user_id = :userId 
                ORDER BY created_at DESC 
                LIMIT :limit OFFSET :offset
            ");
            
            $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return [];
        }
    }
}
?>