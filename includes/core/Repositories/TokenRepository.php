<?php
// includes/core/Repositories/TokenRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\TokenRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;
use PDOException;

class TokenRepository implements TokenRepositoryInterface {
    private $pdo;

    public function __construct(DatabaseManager $db) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
    }

    public function createToken(int $userId, string $selector, string $hashedValidator, string $expiresAt, string $userAgent, string $ipAddress, ?string $location = null, ?string $asn = null): bool {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;

        try {
            $stmt = $this->pdo->prepare("INSERT INTO {$tblAuthTokens} (user_id, selector, hashed_validator, expires_at, user_agent, ip_address, location, asn) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            return $stmt->execute([$userId, $selector, $hashedValidator, $expiresAt, $userAgent, $ipAddress, $location, $asn]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'ip_address' => $ipAddress, 'exception' => $e]);
            return false;
        }
    }

    public function findValidTokenBySelectorAndUserId(string $selector, int $userId): ?array {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;
        $tblUsers = DB::TBL_USERS;

        try {
            $stmt = $this->pdo->prepare("
                SELECT t.id, t.hashed_validator 
                FROM {$tblAuthTokens} t 
                JOIN {$tblUsers} u ON t.user_id = u.id 
                WHERE t.selector = ? AND t.user_id = ? AND t.expires_at > NOW() AND u.deletion_scheduled_at IS NULL
            ");
            $stmt->execute([$selector, $userId]);
            $token = $stmt->fetch(PDO::FETCH_ASSOC);
            return $token ?: null;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return null;
        }
    }

    public function findValidTokenBySelector(string $selector): ?array {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;

        try {
            $stmt = $this->pdo->prepare("SELECT * FROM {$tblAuthTokens} WHERE selector = ? AND expires_at > NOW()");
            $stmt->execute([$selector]);
            $token = $stmt->fetch(PDO::FETCH_ASSOC);
            return $token ?: null;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['exception' => $e]);
            return null;
        }
    }

    /**
     * OPTIMIZADO: Medida de seguridad (Guard Clause) para evitar saturación de memoria
     * o desbordamiento de la consulta SQL si el input es manipulado maliciosamente.
     */
    public function findValidTokensBySelectors(array $selectors): array {
        if (empty($selectors)) return [];
        
        // Prevención de ataques mediante listas masivas (Max ~100 tokens procesados a la vez)
        if (count($selectors) > 100) {
            $selectors = array_slice($selectors, 0, 100);
            Logger::warning("Se han detectado demasiados selectores en findValidTokensBySelectors, truncando a 100 por seguridad.", []);
        }
        
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;
        $tblUsers = DB::TBL_USERS;

        $placeholders = implode(',', array_fill(0, count($selectors), '?'));
        try {
            $stmt = $this->pdo->prepare("
                SELECT t.*
                FROM {$tblAuthTokens} t 
                JOIN {$tblUsers} u ON t.user_id = u.id 
                WHERE t.selector IN ($placeholders) AND t.expires_at > NOW() AND u.deletion_scheduled_at IS NULL
            ");
            $stmt->execute($selectors);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['exception' => $e]);
            return [];
        }
    }

    public function findSelectorByIdAndUserId(int $tokenId, int $userId): ?string {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;
        try {
            $stmt = $this->pdo->prepare("SELECT selector FROM {$tblAuthTokens} WHERE id = ? AND user_id = ?");
            $stmt->execute([$tokenId, $userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ? $result['selector'] : null;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['exception' => $e]);
            return null;
        }
    }

    public function deleteBySelector(string $selector): bool {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;

        try {
            $stmt = $this->pdo->prepare("DELETE FROM {$tblAuthTokens} WHERE selector = ?");
            return $stmt->execute([$selector]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['exception' => $e]);
            return false;
        }
    }

    public function deleteAllByUserId(int $userId): bool {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;

        try {
            $stmt = $this->pdo->prepare("DELETE FROM {$tblAuthTokens} WHERE user_id = ?");
            return $stmt->execute([$userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function deleteById(int $id): bool {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;

        try {
            $stmt = $this->pdo->prepare("DELETE FROM {$tblAuthTokens} WHERE id = ?");
            return $stmt->execute([$id]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['token_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    /**
     * OPTIMIZADO: Límite duro integrado a la consulta para proteger la DB contra ataques DDoS
     * de creación masiva de sesiones si el rate limit general llegase a fallar.
     */
    public function getActiveDevicesByUserId(int $userId, int $limit = 50): array {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;

        try {
            $stmt = $this->pdo->prepare("
                SELECT id, user_agent, ip_address, location, asn, expires_at, selector 
                FROM {$tblAuthTokens} 
                WHERE user_id = :userId 
                ORDER BY expires_at DESC 
                LIMIT :limit
            ");
            $stmt->bindValue(':userId', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return [];
        }
    }

    public function revokeDevice(int $tokenId, int $userId): bool {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;

        try {
            $stmt = $this->pdo->prepare("DELETE FROM {$tblAuthTokens} WHERE id = ? AND user_id = ?");
            return $stmt->execute([$tokenId, $userId]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['token_id' => $tokenId, 'user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function revokeOtherDevices(int $userId, string $currentSelector): bool {
        $tblAuthTokens = DB::TBL_AUTH_TOKENS;

        try {
            $stmt = $this->pdo->prepare("DELETE FROM {$tblAuthTokens} WHERE user_id = ? AND selector != ?");
            return $stmt->execute([$userId, $currentSelector]);
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }
}
?>