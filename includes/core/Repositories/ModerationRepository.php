<?php
// includes/core/Repositories/ModerationRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\ModerationRepositoryInterface;
use PDO;

class ModerationRepository implements ModerationRepositoryInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function updateStatus(int $userId, string $status, ?string $deletedBy, ?string $deletedReason, int $isSuspended, ?string $suspensionType, ?string $suspensionReason, ?string $endDate, ?string $adminNotes = null): bool {
        try {
            $this->pdo->beginTransaction();

            // 1. Actualizamos el estado ligero en la tabla users
            $stmtUser = $this->pdo->prepare("UPDATE users SET user_status = ? WHERE id = ?");
            $stmtUser->execute([$status, $userId]);

            // 2. Actualizamos el detalle en user_restrictions
            $stmtRest = $this->pdo->prepare("
                UPDATE user_restrictions 
                SET is_suspended = ?, suspension_type = ?, suspension_reason = ?, suspension_end_date = ?,
                    deleted_by = ?, deleted_reason = ?, admin_notes = ?
                WHERE user_id = ?
            ");
            $stmtRest->execute([$isSuspended, $suspensionType, $suspensionReason, $endDate, $deletedBy, $deletedReason, $adminNotes, $userId]);

            $this->pdo->commit();
            return true;
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            return false;
        }
    }

    public function logAction(int $userId, ?int $adminId, string $actionType, ?string $reason, ?string $endDate, ?string $adminNotes = null): bool {
        $stmt = $this->pdo->prepare("
            INSERT INTO moderation_logs (user_id, admin_id, action_type, reason, end_date, admin_notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        return $stmt->execute([$userId, $adminId, $actionType, $reason, $endDate, $adminNotes]);
    }

    public function getKardex(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT 
                m.id, m.action_type, m.reason, m.end_date, m.admin_notes, m.created_at,
                u.username as admin_username, u.profile_picture as admin_profile_picture, u.role as admin_role
            FROM moderation_logs m
            LEFT JOIN users u ON m.admin_id = u.id
            WHERE m.user_id = ?
            ORDER BY m.created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>