<?php

namespace App\Core\Repositories;

use App\Core\Interfaces\ProfileLogRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Config\Database\CassandraManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;
use PDOException;

class ProfileLogRepository implements ProfileLogRepositoryInterface {
    private $pdo;
    private $cassandraSession = null;

    public function __construct(DatabaseManager $db) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
        try {
            $cassandra = new CassandraManager();
            $this->cassandraSession = $cassandra->getSession();
        } catch (\Exception $e) {
            Logger::error("Failed to initialize Cassandra in " . __METHOD__, ['exception' => $e]);
        }
    }

    public function countRecentChanges(int $userId, string $changeType, int $days): int {
        if (!$this->cassandraSession) {
            Logger::warning("Cassandra session not available in " . __METHOD__);
            return 0;
        }

        try {
            $dt = new \DateTime();
            $dt->modify("-{$days} days");

            $stmt = $this->cassandraSession->prepare("
                SELECT change_type FROM db_identity_nosql.profile_changes_log 
                WHERE user_id = ? AND created_at >= ?
            ");
            $rows = $this->cassandraSession->execute($stmt, [(int)$userId, $dt])->asRowsResult();
            
            $count = 0;
            foreach ($rows as $row) {
                if (($row['change_type'] ?? '') === $changeType) {
                    $count++;
                }
            }
            return $count;
        } catch (\Exception $e) {
            Logger::error("Cassandra error in " . __METHOD__, ['user_id' => $userId, 'change_type' => $changeType, 'exception' => $e]);
            return 0; 
        }
    }

    public function countAllLogsByUserId(int $userId): int {
        if (!$this->cassandraSession) {
            Logger::warning("Cassandra session not available in " . __METHOD__);
            return 0;
        }
        try {
            $stmt = $this->cassandraSession->prepare("
                SELECT COUNT(*) FROM db_identity_nosql.profile_changes_log 
                WHERE user_id = ?
            ");
            $rows = $this->cassandraSession->execute($stmt, [(int)$userId])->asRowsResult();
            foreach ($rows as $row) {
                return (int)($row['count'] ?? 0);
            }
            return 0;
        } catch (\Exception $e) {
            Logger::error("Cassandra error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return 0;
        }
    }

    public function logChange(int $userId, string $changeType, ?string $oldValue, ?string $newValue, string $ipAddress, ?string $asn = null): bool {
        if (!$this->cassandraSession) {
            Logger::warning("Cassandra session not available in " . __METHOD__);
            return false;
        }

        try {
            $changeId = \App\Core\Helpers\Utils::generateUUID();
            $stmt = $this->cassandraSession->prepare("
                INSERT INTO db_identity_nosql.profile_changes_log (user_id, created_at, change_id, change_type, old_value, new_value, ip_address, asn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $this->cassandraSession->execute($stmt, [
                (int)$userId,
                new \DateTime(),
                $changeId,
                $changeType,
                $oldValue,
                $newValue,
                $ipAddress,
                $asn
            ]);
            return true;
        } catch (\Exception $e) {
            Logger::error("Cassandra error in " . __METHOD__, ['user_id' => $userId, 'change_type' => $changeType, 'exception' => $e]);
            return false;
        }
    }

    public function getLogsByUserId(int $userId, int $limit = 50, int $offset = 0): array {
        if (!$this->cassandraSession) {
            Logger::warning("Cassandra session not available in " . __METHOD__);
            return [];
        }

        try {
            $stmt = $this->cassandraSession->prepare("
                SELECT change_id, change_type, old_value, new_value, ip_address, asn, created_at 
                FROM db_identity_nosql.profile_changes_log 
                WHERE user_id = ?
            ");
            $rows = $this->cassandraSession->execute($stmt, [(int)$userId])->asRowsResult();
            
            $logs = [];
            foreach ($rows as $row) {
                $createdAt = '';
                if (isset($row['created_at'])) {
                    if ($row['created_at'] instanceof \DateTime) {
                        $createdAt = $row['created_at']->format('Y-m-d H:i:s');
                    } else if (is_string($row['created_at'])) {
                        $createdAt = $row['created_at'];
                    }
                }
                
                $logs[] = [
                    'id' => $row['change_id'] ?? '',
                    'change_type' => $row['change_type'] ?? '',
                    'old_value' => $row['old_value'] ?? null,
                    'new_value' => $row['new_value'] ?? null,
                    'ip_address' => $row['ip_address'] ?? '',
                    'asn' => $row['asn'] ?? null,
                    'created_at' => $createdAt
                ];
            }
            
            return array_slice($logs, $offset, $limit);
        } catch (\Exception $e) {
            Logger::error("Cassandra error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return [];
        }
    }
}
?>