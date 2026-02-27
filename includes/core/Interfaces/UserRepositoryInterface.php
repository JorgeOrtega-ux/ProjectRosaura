<?php
// includes/core/Interfaces/UserRepositoryInterface.php

namespace App\Core\Interfaces;

interface UserRepositoryInterface {
    public function findById(int $id): ?array;
    public function findByEmail(string $email): ?array;
    public function findByUsername(string $username): ?array;
    public function createUser(array $data): int;
    
    // Firma actualizada para soportar columnas independientes
    public function updateStatus(int $id, string $status, ?string $deletedBy, ?string $deletedReason, int $isSuspended, ?string $suspensionType, ?string $suspensionReason, ?string $endDate): bool;
    
    // Nuevo método para expirar suspensiones automáticamente sin afectar si la cuenta está eliminada
    public function liftSuspension(int $id): bool;

    public function updateAvatar(int $id, string $path): bool;
    public function updateUsername(int $id, string $username): bool;
    public function updateEmail(int $id, string $email): bool;
    public function updatePassword(int $id, string $hashedPassword): bool;
    public function update2FA(int $id, ?string $secret, int $enabled, ?string $recoveryCodes): bool;
    public function updateRecoveryCodes(int $id, string $recoveryCodes): bool;
    public function updatePreference(int $userId, string $key, $value): bool;
    public function updateRole(int $id, string $role): bool;
}
?>