<?php

namespace App\Core\Interfaces;

interface VerificationCodeRepositoryInterface {
    public function createCode(string $identifier, string $codeType, string $code, string $payload, string $expiresAt): bool;
    public function findLatestValidByIdentifierAndType(string $identifier, string $codeType): ?array;
    public function findValidByCodeAndType(string $code, string $codeType): ?array;
    public function hasActiveCode(string $identifier, string $codeType): bool;
    public function deleteById(int $id): bool;
    public function deleteByIdentifierAndType(string $identifier, string $codeType): bool;
}
?>