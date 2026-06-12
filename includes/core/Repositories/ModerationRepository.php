<?php
// includes/core/Repositories/ModerationRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\ModerationRepositoryInterface;
use App\Config\DatabaseManager;
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
                UPDATE {$tblUserRestr} 
                SET is_suspended = ?, suspension_type = ?, suspension_reason = ?, 
                    suspension_end_date = ?, deleted_by = ?, deleted_reason = ?, 
                    admin_notes = ? 
                WHERE user_id = ?
            ");
            
            $stmtRest->execute([
                $isSuspended, $suspensionType, $suspensionReason, 
                $endDate, $deletedBy, $deletedReason, 
                $adminNotes, $userId
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

    public function getKardex(int $userId): array {
        $tblModLogs = DB::TBL_MODERATION_LOGS;
        $tblUsers = DB::TBL_USERS;
        $tblRoles = DB::TBL_ROLES;
        $tblUserRoles = DB::TBL_USER_ROLES;

        try {
            $stmt = $this->pdo->prepare("
                SELECT ml.*, u.username as admin_username, u.profile_picture as admin_profile_picture,
                       (SELECT r.name FROM {$tblRoles} r INNER JOIN {$tblUserRoles} ur ON r.id = ur.role_id WHERE ur.user_id = ml.admin_id ORDER BY r.weight DESC LIMIT 1) as admin_role
                FROM {$tblModLogs} ml
                LEFT JOIN {$tblUsers} u ON ml.admin_id = u.id
                WHERE ml.user_id = ?
                ORDER BY ml.created_at DESC
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return [];
        }
    }
}
?>