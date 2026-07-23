<?php

namespace App\Core\Interfaces;

interface UserRepositoryInterface {
    public function findById(int $id): ?array;
    public function findByUuid(string $uuid): ?array;
    public function findByEmail(string $email): ?array;
    public function findByGoogleId(string $googleId): ?array;
    public function updateGoogleId(int $id, ?string $googleId): bool;
    public function findByUsername(string $username): ?array;
    public function createUser(array $data): int;
    public function liftSuspension(int $id): bool;
    public function getUsersList(int $limit, int $offset): array;

    public function updateAvatar(int $id, string $path): bool;
    public function updateUsername(int $id, string $username): bool;
    public function updateEmail(int $id, string $email): bool;
    public function updatePurchasePreference(int $id, string $pref): bool;
    public function updatePassword(int $id, string $hashedPassword): bool;
    public function update2FA(int $id, ?string $secret, int $enabled, ?string $recoveryCodes): bool;
    public function updateRecoveryCodes(int $id, string $recoveryCodes): bool;
    public function updatePreference(int $userId, string $key, $value): bool;
    public function setFlag(int $userId, string $flagKey): bool;
    public function scheduleDeletion(int $userId, string $date): bool;
    public function cancelDeletion(int $userId): bool;
    public function deleteUserHard(int $userId): bool;
    public function updateStorageUsed(int $userId, int $bytesDelta): bool;
    public function getStorageUsed(int $userId): float;
    public function getRegistrationStats(string $startDate, string $endDate): array;
    public function getCustomPalettes(int $userId): array;
    public function getTemplateTokenUsage(int $userId): array;
    public function consumeTemplateTokens(int $userId, int $tokensToConsume, int $windowHours = 5): array;
    public function invalidateProfileCache(int $userId, ?string $uuid = null): void;
}
?>