<?php

namespace App\Core\Interfaces;

interface RateLimiterInterface {
    public function consume(string $key, int $maxAttempts, int $lockoutMinutes, bool $isCritical = false): array;
    public function clear(string $key): void;
}
?>