<?php

namespace App\Core\Repositories;

use App\Core\Interfaces\ModerationRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;
use PDOException;

class ModerationRepository implements ModerationRepositoryInterface {
    private $pdo;

    public function __construct(DatabaseManager $db) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
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

    public function getUnifiedKardex(int $userId, int $limit, int $offset): array {
        $tblModLogs = DB::TBL_MODERATION_LOGS;
        $tblProfileLogs = DB::TBL_PROFILE_CHANGES_LOG;
        $tblUsers = DB::TBL_USERS;
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;

        try {
            $sql = "
                SELECT 
                    ml.created_at,
                    ml.action_type,
                    ml.reason,
                    u.username as admin_username,
                    u.profile_picture as admin_profile_picture,
                    admin_roles.top_role_name as admin_role,
                    admin_roles.top_role_color as admin_role_color
                FROM {$tblModLogs} ml
                LEFT JOIN {$tblUsers} u ON ml.admin_id = u.id
                LEFT JOIN (
                    SELECT ur_top.user_id,
                           SUBSTRING_INDEX(GROUP_CONCAT(r_top.name ORDER BY r_top.weight DESC), ',', 1) as top_role_name,
                           SUBSTRING_INDEX(GROUP_CONCAT(r_top.color ORDER BY r_top.weight DESC SEPARATOR '|||'), '|||', 1) as top_role_color
                    FROM {$tblUserRoles} ur_top
                    INNER JOIN {$tblRoles} r_top ON ur_top.role_id = r_top.id
                    GROUP BY ur_top.user_id
                ) admin_roles ON admin_roles.user_id = ml.admin_id
                WHERE ml.user_id = :userId1

                UNION ALL

                SELECT 
                    pl.created_at,
                    CONCAT('profile_', pl.change_type) as action_type,
                    CONCAT('{\"field\": \"', pl.change_type, '\", \"old\": \"', COALESCE(pl.old_value, 'null'), '\", \"new\": \"', COALESCE(pl.new_value, 'null'), '\"}') as reason,
                    'user_action' as admin_username,
                    (SELECT profile_picture FROM {$tblUsers} WHERE id = :userId2) as admin_profile_picture,
                    'user' as admin_role,
                    '{\"type\":\"solid\",\"colors\":[\"#808080\"]}' as admin_role_color
                FROM {$tblProfileLogs} pl
                WHERE pl.user_id = :userId3

                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':userId1', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':userId2', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':userId3', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return [];
        }
    }

    public function countUnifiedKardex(int $userId): int {
        $tblModLogs = DB::TBL_MODERATION_LOGS;
        $tblProfileLogs = DB::TBL_PROFILE_CHANGES_LOG;

        try {
            $sql = "
                SELECT SUM(total) as count FROM (
                    SELECT COUNT(id) as total FROM {$tblModLogs} WHERE user_id = ?
                    UNION ALL
                    SELECT COUNT(id) as total FROM {$tblProfileLogs} WHERE user_id = ?
                ) as combined_counts
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$userId, $userId]);
            return (int) $stmt->fetchColumn();
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return 0;
        }
    }
}
?>