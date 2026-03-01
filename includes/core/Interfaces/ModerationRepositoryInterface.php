<?php
// includes/core/Interfaces/ModerationRepositoryInterface.php

namespace App\Core\Interfaces;

interface ModerationRepositoryInterface {
    /**
     * Actualiza el estado principal del usuario y sus restricciones.
     */
    public function updateStatus(int $userId, string $status, ?string $deletedBy, ?string $deletedReason, int $isSuspended, ?string $suspensionType, ?string $suspensionReason, ?string $endDate, ?string $adminNotes = null): bool;

    /**
     * Registra una acción de moderación en el historial inmutable (Kardex).
     */
    public function logAction(int $userId, ?int $adminId, string $actionType, ?string $reason, ?string $endDate, ?string $adminNotes = null): bool;
}
?>