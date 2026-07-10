<?php

namespace App\Core\Interfaces;

interface SessionManagerInterface {
    public function start(): void;
    public function set(string $key, $value): void;
    public function get(string $key, $default = null);
    public function has(string $key): bool;
    public function remove(string $key): void;
    public function destroy(): void;
    public function regenerate(bool $deleteOldSession = true): bool;
    public function isLoggedIn(): bool;
    public function getActiveAccountId(): ?int;
    public function getLinkedAccounts(): array;
    public function addAccount(int $userId, array $userData): bool;
    public function switchActiveAccount(int $userId): bool;
    public function removeAccount(int $userId): void;
    public function getSubscriptionTier(): int;
    public function getCsrfToken(): string;
    public function validateCsrfToken(string $token): bool;
    public function destroyUserSessions(int $userId): void;
    public function flushAllSessionsForUser(int $userId): void;
    
    public function destroySessionsByRoleId(int $roleId): void;
    public function restoreAccountInPool(int $userId): void; 
    public function destroySessionsByRoles(array $roleIds): void;
    public function invalidateAccountInPool(int $userId): void;
    public function invalidateDeviceInPool(string $selector): void;
    
    public function invalidateRoleInPool(int $roleId): void;
    public function enforcePassiveInvalidation(): void;
}
?>