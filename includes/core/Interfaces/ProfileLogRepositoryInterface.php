<?php

namespace App\Core\Interfaces;

interface ProfileLogRepositoryInterface {
    public function countRecentChanges(int $userId, string $changeType, int $days): int;
    
    public function countAllLogsByUserId(int $userId): int;
    
    public function logChange(int $userId, string $changeType, ?string $oldValue, ?string $newValue, string $ipAddress, ?string $asn = null): bool;
    
    public function getLogsByUserId(int $userId, int $limit = 50, int $offset = 0): array;
}