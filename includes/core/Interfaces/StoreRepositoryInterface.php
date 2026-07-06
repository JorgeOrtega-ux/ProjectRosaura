<?php
namespace App\Core\Interfaces;

interface StoreRepositoryInterface {
    public function addCoins(int $userId, int $amount): bool;
    public function deductCoins(int $userId, int $amount): bool;
    public function getCoins(int $userId): int;
    public function createStorePurchaseRecord(array $data): bool;
    public function addPerkToUser(int $userId, string $perkId, int $coinsSpent = 0): bool;
    public function getUserPerks(int $userId): array;
    public function getUnusedPerks(int $userId): array;
    public function markPerkAsUsed(int $userId, string $perkId): bool;
}
