<?php
// includes/core/Interfaces/UserRepositoryInterface.php

namespace App\Core\Interfaces;

interface UserRepositoryInterface {
    public function findById(int $id): ?array;
    public function findByEmail(string $email): ?array;
    public function findByUsername(string $username): ?array;
    public function createUser(array $data): int;
    
    // Este método se mantiene aquí para levantamientos automáticos rápidos (AutoLogin)
    public function liftSuspension(int $id): bool;

    public function updateAvatar(int $id, string $path): bool;
    public function updateUsername(int $id, string $username): bool;
    public function updateEmail(int $id, string $email): bool;
    public function updatePassword(int $id, string $hashedPassword): bool;
    public function update2FA(int $id, ?string $secret, int $enabled, ?string $recoveryCodes): bool;
    public function updateRecoveryCodes(int $id, string $recoveryCodes): bool;
    public function updatePreference(int $userId, string $key, $value): bool;
    
    // ==========================================
    // NUEVOS MÉTODOS PARA HARD DELETE Y GRACE PERIOD
    // ==========================================
    public function scheduleDeletion(int $userId, string $date): bool;
    public function cancelDeletion(int $userId): bool;
    public function deleteUserHard(int $userId): bool;

    // ==========================================
    // NUEVOS MÉTODOS PARA DASHBOARD METRICS
    // ==========================================
    public function getRegistrationStats(string $startDate, string $endDate): array;
}
?>