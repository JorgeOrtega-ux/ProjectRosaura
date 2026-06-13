<?php

namespace App\Core\Interfaces;

interface TokenRepositoryInterface {
    public function createToken(int $userId, string $selector, string $hashedValidator, string $expiresAt, string $userAgent, string $ipAddress, ?string $location = null, ?string $asn = null): bool;
    
    public function findValidTokenBySelectorAndUserId(string $selector, int $userId): ?array;
    
    public function findValidTokenBySelector(string $selector): ?array;
    
    public function findValidTokensBySelectors(array $selectors): array;

    public function findSelectorByIdAndUserId(int $tokenId, int $userId): ?string;
    
    public function deleteBySelector(string $selector): bool;
    
    public function deleteAllByUserId(int $userId): bool;
    
    public function deleteById(int $id): bool;
    
    public function getActiveDevicesByUserId(int $userId): array;
    
    public function revokeDevice(int $tokenId, int $userId): bool;
    
    public function revokeOtherDevices(int $userId, string $currentSelector): bool;
}