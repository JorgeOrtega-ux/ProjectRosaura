<?php
// includes/core/Interfaces/ModerationRepositoryInterface.php

namespace App\Core\Interfaces;

interface ModerationRepositoryInterface {
    public function updateStatus(int $userId, string $status, ?string $deletedBy, ?string $deletedReason, int $isSuspended, ?string $suspensionType, ?string $suspensionReason, ?string $endDate, ?string $adminNotes = null): bool;

    public function logAction(int $userId, ?int $adminId, string $actionType, ?string $reason, ?string $endDate, ?string $adminNotes = null): bool;

    public function getKardex(int $userId): array;
}
?>