<?php

namespace App\Core\Repositories;

use App\Core\Interfaces\ModerationRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Config\Database\CassandraManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\ModerationConstants;
use PDO;
use PDOException;

class ModerationRepository implements ModerationRepositoryInterface {
    private $pdo;
    private $cassandraSession = null;

    public function __construct(DatabaseManager $db, CassandraManager $cassandra) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
        $this->cassandraSession = $cassandra->getSession();
    }

    public function updateStatus(int $userId, string $status, ?string $deletedBy, ?string $deletedReason, int $isSuspended, ?string $suspensionType, ?string $suspensionReason, ?string $endDate, ?string $adminNotes = null): bool {
        $tblUserRestr = DB::TBL_USER_RESTRICTIONS;

        try {
            $this->pdo->beginTransaction();

            $stmtRest = $this->pdo->prepare("
                INSERT INTO {$tblUserRestr} (
                    user_id, is_suspended, suspension_type, suspension_reason, 
                    suspension_end_date, deleted_by, deleted_reason, admin_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    is_suspended = VALUES(is_suspended),
                    suspension_type = VALUES(suspension_type),
                    suspension_reason = VALUES(suspension_reason),
                    suspension_end_date = VALUES(suspension_end_date),
                    deleted_by = VALUES(deleted_by),
                    deleted_reason = VALUES(deleted_reason),
                    admin_notes = VALUES(admin_notes)
            ");
            
            $stmtRest->execute([
                $userId, $isSuspended, $suspensionType, $suspensionReason, 
                $endDate, $deletedBy, $deletedReason, $adminNotes
            ]);

            $this->pdo->commit();
            return true;
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function logAction(int $userId, ?int $adminId, string $actionType, ?string $reason, ?string $endDate, ?string $adminNotes = null): bool {
        $tblModLogs = DB::TBL_MODERATION_LOGS;

        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO {$tblModLogs} (user_id, admin_id, action_type, reason, end_date, admin_notes) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            return $stmt->execute([$userId, $adminId, $actionType, $reason, $endDate, $adminNotes]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function getUnifiedKardex(int $userId, int $limit, int $offset, array $categoryFilter = []): array {
        $tblModLogs = DB::TBL_MODERATION_LOGS;
        $tblUsers = DB::TBL_USERS;
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;

        $includeModeration = empty($categoryFilter) || in_array('moderation', $categoryFilter);
        $includeRole = empty($categoryFilter) || in_array('role', $categoryFilter);
        $includeProfile = empty($categoryFilter) || in_array('profile', $categoryFilter);

        $mergedLogs = [];

        // 1. Fetch moderation/role logs from MySQL
        if ($includeModeration || $includeRole) {
            $modFilter = "";
            if (!$includeModeration && $includeRole) {
                $modFilter = " AND ml.action_type = '" . ModerationConstants::ACTION_ROLE_CHANGED . "' ";
            } elseif ($includeModeration && !$includeRole) {
                $modFilter = " AND ml.action_type != '" . ModerationConstants::ACTION_ROLE_CHANGED . "' ";
            }

            try {
                // Fetch up to ($offset + $limit) to allow correct sorting/merging
                $fetchLimit = $offset + $limit;
                $sql = "
                    SELECT 
                        ml.created_at,
                        ml.action_type,
                        ml.reason,
                        u.username as admin_username,
                        u.profile_picture as admin_profile_picture,
                        admin_roles.top_role_name as admin_role,
                        st.color as admin_subscription_color,
                        admin_roles.top_role_color as admin_role_color
                    FROM {$tblModLogs} ml
                    LEFT JOIN {$tblUsers} u ON ml.admin_id = u.id
                    LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                    LEFT JOIN (
                        SELECT ur_top.user_id,
                               SUBSTRING_INDEX(GROUP_CONCAT(r_top.name ORDER BY r_top.weight DESC), ',', 1) as top_role_name,
                               SUBSTRING_INDEX(GROUP_CONCAT(r_top.color ORDER BY r_top.weight DESC SEPARATOR '|||'), '|||', 1) as top_role_color
                        FROM {$tblUserRoles} ur_top
                        INNER JOIN {$tblRoles} r_top ON ur_top.role_id = r_top.id
                        GROUP BY ur_top.user_id
                    ) admin_roles ON admin_roles.user_id = ml.admin_id
                    WHERE ml.user_id = :userId {$modFilter}
                    ORDER BY ml.created_at DESC
                    LIMIT :limit
                ";

                $stmt = $this->pdo->prepare($sql);
                $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':limit', $fetchLimit, PDO::PARAM_INT);
                $stmt->execute();
                
                $mysqlLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($mysqlLogs as $row) {
                    $mergedLogs[] = $row;
                }
            } catch (PDOException $e) {
                Logger::error("MySQL error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            }
        }

        // 2. Fetch profile logs from Cassandra
        if ($includeProfile && $this->cassandraSession) {
            try {
                $fetchLimit = $offset + $limit;
                $profilePic = 'default.png';
                try {
                    $stmtUser = $this->pdo->prepare("SELECT profile_picture FROM {$tblUsers} WHERE id = ? LIMIT 1");
                    $stmtUser->execute([$userId]);
                    $pic = $stmtUser->fetchColumn();
                    if ($pic) {
                        $profilePic = $pic;
                    }
                } catch (\Exception $ex) {}

                $stmt = $this->cassandraSession->prepare("
                    SELECT created_at, change_type, old_value, new_value 
                    FROM db_identity_nosql.profile_changes_log 
                    WHERE user_id = ?
                    LIMIT ?
                ");
                $rows = $this->cassandraSession->execute($stmt, [(int)$userId, (int)$fetchLimit])->asRowsResult();
                
                foreach ($rows as $row) {
                    $createdAt = '';
                    if (isset($row['created_at'])) {
                        if ($row['created_at'] instanceof \DateTime) {
                            $createdAt = $row['created_at']->format('Y-m-d H:i:s');
                        } else if (is_string($row['created_at'])) {
                            $createdAt = $row['created_at'];
                        }
                    }
                    
                    $changeType = $row['change_type'] ?? '';
                    $oldVal = $row['old_value'] ?? 'null';
                    $newVal = $row['new_value'] ?? 'null';
                    
                    $reasonArr = [
                        'field' => $changeType,
                        'old' => $oldVal,
                        'new' => $newVal
                    ];

                    $mergedLogs[] = [
                        'created_at' => $createdAt,
                        'action_type' => 'profile_' . $changeType,
                        'reason' => json_encode($reasonArr),
                        'admin_username' => 'user_action',
                        'admin_profile_picture' => $profilePic,
                        'admin_role' => 'user',
                        'admin_subscription_color' => '{"type":"solid","colors":["#808080"]}',
                        'admin_role_color' => '{"type":"solid","colors":["#808080"]}'
                    ];
                }
            } catch (\Exception $e) {
                Logger::error("Cassandra error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            }
        }

        // 3. Sort merged logs by created_at DESC
        usort($mergedLogs, function($a, $b) {
            return strcmp($b['created_at'], $a['created_at']);
        });

        // 4. Return correct page slice
        return array_slice($mergedLogs, $offset, $limit);
    }

    public function countUnifiedKardex(int $userId, array $categoryFilter = []): int {
        $tblModLogs = DB::TBL_MODERATION_LOGS;

        $includeModeration = empty($categoryFilter) || in_array('moderation', $categoryFilter);
        $includeRole = empty($categoryFilter) || in_array('role', $categoryFilter);
        $includeProfile = empty($categoryFilter) || in_array('profile', $categoryFilter);

        $totalCount = 0;

        // Count moderation and role logs from MySQL
        if ($includeModeration || $includeRole) {
            $modFilter = "";
            if (!$includeModeration && $includeRole) {
                $modFilter = " AND action_type = '" . ModerationConstants::ACTION_ROLE_CHANGED . "' ";
            } elseif ($includeModeration && !$includeRole) {
                $modFilter = " AND action_type != '" . ModerationConstants::ACTION_ROLE_CHANGED . "' ";
            }

            try {
                $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM {$tblModLogs} WHERE user_id = ? {$modFilter}");
                $stmt->execute([$userId]);
                $totalCount += (int) $stmt->fetchColumn();
            } catch (PDOException $e) {
                Logger::error("MySQL error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            }
        }

        // Count profile logs from Cassandra
        if ($includeProfile && $this->cassandraSession) {
            try {
                $stmt = $this->cassandraSession->prepare("
                    SELECT COUNT(*) FROM db_identity_nosql.profile_changes_log 
                    WHERE user_id = ?
                ");
                $rows = $this->cassandraSession->execute($stmt, [(int)$userId])->asRowsResult();
                foreach ($rows as $row) {
                    $totalCount += (int)($row['count'] ?? 0);
                }
            } catch (\Exception $e) {
                Logger::error("Cassandra error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            }
        }

        return $totalCount;
    }
}
?>