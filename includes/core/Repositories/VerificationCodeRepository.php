<?php
// includes/core/Repositories/VerificationCodeRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use App\Core\System\Logger;
use PDO;
use PDOException;

class VerificationCodeRepository implements VerificationCodeRepositoryInterface {
    private $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function createCode(string $identifier, string $codeType, string $code, string $payload, string $expiresAt): bool {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, ?, ?, ?, ?)");
            return $stmt->execute([$identifier, $codeType, $code, $payload, $expiresAt]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['identifier' => $identifier, 'code_type' => $codeType, 'exception' => $e]);
            return false;
        }
    }

    public function findLatestValidByIdentifierAndType(string $identifier, string $codeType): ?array {
        try {
            // Pasamos la fecha de PHP en vez de usar NOW() para la expiración y evitamos desincronizaciones
            $now = date('Y-m-d H:i:s');
            
            // Pedimos a MySQL que calcule los segundos exactos desde la creación para evitar el strtotime()
            $stmt = $this->pdo->prepare("
                SELECT *, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_elapsed 
                FROM verification_codes 
                WHERE identifier = ? AND code_type = ? AND expires_at > ? 
                ORDER BY created_at DESC LIMIT 1
            ");
            $stmt->execute([$identifier, $codeType, $now]);
            $code = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $code ?: null;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['identifier' => $identifier, 'code_type' => $codeType, 'exception' => $e]);
            return null;
        }
    }

    public function findValidByCodeAndType(string $code, string $codeType): ?array {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM verification_codes WHERE code = ? AND code_type = ? AND expires_at > NOW()");
            $stmt->execute([$code, $codeType]);
            $verification = $stmt->fetch(PDO::FETCH_ASSOC);
            return $verification ?: null;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['code_type' => $codeType, 'exception' => $e]);
            return null;
        }
    }

    public function hasActiveCode(string $identifier, string $codeType): bool {
        try {
            $stmt = $this->pdo->prepare("SELECT id FROM verification_codes WHERE identifier = ? AND code_type = ? AND expires_at > NOW()");
            $stmt->execute([$identifier, $codeType]);
            return $stmt->rowCount() > 0;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['identifier' => $identifier, 'code_type' => $codeType, 'exception' => $e]);
            return false;
        }
    }

    public function deleteById(int $id): bool {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE id = ?");
            return $stmt->execute([$id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['id' => $id, 'exception' => $e]);
            return false;
        }
    }

    public function deleteByIdentifierAndType(string $identifier, string $codeType): bool {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE identifier = ? AND code_type = ?");
            return $stmt->execute([$identifier, $codeType]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['identifier' => $identifier, 'code_type' => $codeType, 'exception' => $e]);
            return false;
        }
    }
}
?>