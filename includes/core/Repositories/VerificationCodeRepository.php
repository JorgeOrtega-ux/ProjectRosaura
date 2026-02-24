<?php
// includes/core/Repositories/VerificationCodeRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use PDO;

class VerificationCodeRepository implements VerificationCodeRepositoryInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function createCode(string $identifier, string $codeType, string $code, string $payload, string $expiresAt): bool {
        $stmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, ?, ?, ?, ?)");
        return $stmt->execute([$identifier, $codeType, $code, $payload, $expiresAt]);
    }

    public function findLatestValidByIdentifierAndType(string $identifier, string $codeType): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM verification_codes WHERE identifier = ? AND code_type = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$identifier, $codeType]);
        $code = $stmt->fetch(PDO::FETCH_ASSOC);
        return $code ?: null;
    }

    public function findValidByCodeAndType(string $code, string $codeType): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM verification_codes WHERE code = ? AND code_type = ? AND expires_at > NOW()");
        $stmt->execute([$code, $codeType]);
        $verification = $stmt->fetch(PDO::FETCH_ASSOC);
        return $verification ?: null;
    }

    public function hasActiveCode(string $identifier, string $codeType): bool {
        $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = ? AND expires_at > NOW()");
        $stmt->execute([$identifier, $codeType]);
        return $stmt->rowCount() > 0;
    }

    public function deleteById(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function deleteByIdentifierAndType(string $identifier, string $codeType): bool {
        $stmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE identifier = ? AND code_type = ?");
        return $stmt->execute([$identifier, $codeType]);
    }
}
?>