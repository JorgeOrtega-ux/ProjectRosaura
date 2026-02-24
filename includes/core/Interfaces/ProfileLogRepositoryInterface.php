<?php
// includes/core/Interfaces/ProfileLogRepositoryInterface.php

namespace App\Core\Interfaces;

interface ProfileLogRepositoryInterface {
    /**
     * Cuenta cuántas veces se ha cambiado un dato de perfil en los últimos X días.
     */
    public function countRecentChanges(int $userId, string $changeType, int $days): int;

    /**
     * Registra un cambio en los datos de perfil.
     */
    public function logChange(int $userId, string $changeType, ?string $oldValue, ?string $newValue, string $ipAddress): bool;
}
?>