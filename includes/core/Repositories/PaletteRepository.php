<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\PaletteRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\DatabaseConstants;
use App\Core\System\CacheConstants;
use PDO;
use PDOException;
use App\Core\System\Logger;

class PaletteRepository implements PaletteRepositoryInterface {
    private $dbManager;
    private $pdo;
    private $redisClient;

    public function __construct(DatabaseManager $dbManager, RedisCache $redisCache = null) {
        $this->dbManager = $dbManager;
        $this->pdo = $dbManager->getConnection(DatabaseConstants::CONN_IDENTITY);
        $this->redisClient = $redisCache ? $redisCache->getClient() : null;
    }

    public function getCustomPalettes(int $userId): array {
        $cacheKey = CacheConstants::PREFIX_USER_PALETTE . $userId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    return json_decode($cached, true) ?? [];
                }
            } catch (\Throwable $e) {}
        }

        try {
            $stmt = $this->pdo->prepare("SELECT id, palette_key, name, colors FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            $palettes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($palettes as &$p) {
                $p['colors'] = json_decode($p['colors'], true) ?? [];
            }

            if ($this->redisClient) {
                try {
                    $this->redisClient->setex($cacheKey, CacheConstants::TTL_TEN_MINS, json_encode($palettes));
                } catch (\Throwable $e) {}
            }

            return $palettes;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return [];
        }
    }

    public function createCustomPalette(int $userId, string $paletteKey, string $name, array $colors): bool {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO custom_palettes (user_id, palette_key, name, colors) VALUES (:user_id, :palette_key, :name, :colors)");
            $result = $stmt->execute([
                ':user_id' => $userId,
                ':palette_key' => $paletteKey,
                ':name' => $name,
                ':colors' => json_encode($colors)
            ]);
            // Invalidate palette cache
            if ($result && $this->redisClient) {
                try {
                    $this->redisClient->del(CacheConstants::PREFIX_USER_PALETTE . $userId);
                } catch (\Throwable $e) {}
            }
            return $result;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function deleteCustomPalette(int $userId, string $paletteKey): bool {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM custom_palettes WHERE user_id = :user_id AND palette_key = :palette_key");
            $stmt->execute([
                ':user_id' => $userId,
                ':palette_key' => $paletteKey
            ]);
            $deleted = $stmt->rowCount() > 0;
            // Invalidate palette cache
            if ($deleted && $this->redisClient) {
                try {
                    $this->redisClient->del(CacheConstants::PREFIX_USER_PALETTE . $userId);
                } catch (\Throwable $e) {}
            }
            return $deleted;
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return false;
        }
    }

    public function countCustomPalettes(int $userId): int {
        // Re-use cached palette list to avoid extra query
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get(CacheConstants::PREFIX_USER_PALETTE . $userId);
                if ($cached !== null && $cached !== false) {
                    $data = json_decode($cached, true);
                    if (is_array($data)) return count($data);
                }
            } catch (\Throwable $e) {}
        }

        try {
            $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM custom_palettes WHERE user_id = :user_id");
            $stmt->execute([':user_id' => $userId]);
            return (int)$stmt->fetchColumn();
        } catch (PDOException $e) {
            Logger::error("Database error in " . __METHOD__, ['user_id' => $userId, 'exception' => $e]);
            return 0;
        }
    }
}
