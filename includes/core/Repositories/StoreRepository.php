<?php
namespace App\Core\Repositories;

use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\System\CacheConstants;
use App\Core\Interfaces\StoreRepositoryInterface;
use App\Core\System\DatabaseConstants as DB;
use PDO;

class StoreRepository implements StoreRepositoryInterface {
    private $db;
    private $redisClient;

    public function __construct(DatabaseManager $db, RedisCache $redisCache = null) {
        $this->db = $db->getConnection(DB::CONN_IDENTITY);
        $this->redisClient = $redisCache ? $redisCache->getClient() : null;
    }

    public function addCoins(int $userId, int $amount): bool {
        $stmt = $this->db->prepare("UPDATE users SET coins = coins + ? WHERE id = ?");
        $res = $stmt->execute([$amount, $userId]);
        if ($res && $this->redisClient) {
            $this->redisClient->del(CacheConstants::PREFIX_STORE_COINS . $userId);
        }
        return $res;
    }

    public function deductCoins(int $userId, int $amount): bool {
        $stmt = $this->db->prepare("UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?");
        $stmt->execute([$amount, $userId, $amount]);
        $res = $stmt->rowCount() > 0;
        if ($res && $this->redisClient) {
            $this->redisClient->del(CacheConstants::PREFIX_STORE_COINS . $userId);
        }
        return $res;
    }

    public function getCoins(int $userId): int {
        $cacheKey = CacheConstants::PREFIX_STORE_COINS . $userId;
        if ($this->redisClient) {
            $cached = $this->redisClient->get($cacheKey);
            if ($cached !== null) return (int)$cached;
        }

        $stmt = $this->db->prepare("SELECT coins FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $coins = $result ? (int) $result['coins'] : 0;
        
        if ($this->redisClient) {
            $this->redisClient->setex($cacheKey, CacheConstants::TTL_ONE_DAY, $coins);
        }
        
        return $coins;
    }

    public function hasProcessedStripeSession(string $sessionId): bool {
        $stmt = $this->db->prepare("SELECT id FROM store_purchases WHERE stripe_checkout_session_id = ? LIMIT 1");
        $stmt->execute([$sessionId]);
        return (bool) $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function createStorePurchaseRecord(array $data): bool {
        $stmt = $this->db->prepare("
            INSERT INTO store_purchases 
            (user_id, stripe_payment_intent_id, stripe_checkout_session_id, item_type, item_amount, amount_cents, currency, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        return $stmt->execute([
            $data['user_id'],
            $data['stripe_payment_intent_id'] ?? null,
            $data['stripe_checkout_session_id'] ?? null,
            $data['item_type'],
            $data['item_amount'],
            $data['amount_cents'],
            $data['currency'] ?? 'usd',
            $data['status'] ?? 'pending'
        ]);
    }

    public function addPerkToUser(int $userId, string $perkId, int $coinsSpent = 0): bool {
        $stmt = $this->db->prepare("
            INSERT INTO user_perks (user_id, perk_id, coins_spent) 
            VALUES (?, ?, ?)
        ");
        return $stmt->execute([$userId, $perkId, $coinsSpent]);
    }

    public function getUserPerks(int $userId): array {
        $stmt = $this->db->prepare("SELECT * FROM user_perks WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUnusedPerks(int $userId): array {
        $stmt = $this->db->prepare("
            SELECT perk_id, COUNT(*) as count 
            FROM user_perks 
            WHERE user_id = ? AND is_used = 0 
            GROUP BY perk_id
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function markPerkAsUsed(int $userId, string $perkId): bool {
        $stmt = $this->db->prepare("
            SELECT id FROM user_perks 
            WHERE user_id = ? AND perk_id = ? AND is_used = 0 
            ORDER BY created_at ASC LIMIT 1
        ");
        $stmt->execute([$userId, $perkId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row) {
            $updateStmt = $this->db->prepare("
                UPDATE user_perks 
                SET is_used = 1, used_at = NOW() 
                WHERE id = ? AND is_used = 0
            ");
            $updateStmt->execute([$row['id']]);
            return $updateStmt->rowCount() > 0;
        }
        return false;
    }

    public function refundPerk(int $userId, string $perkId): bool {
        $stmt = $this->db->prepare("
            SELECT id FROM user_perks 
            WHERE user_id = ? AND perk_id = ? AND is_used = 1 
            ORDER BY used_at DESC LIMIT 1
        ");
        $stmt->execute([$userId, $perkId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row) {
            $updateStmt = $this->db->prepare("
                UPDATE user_perks 
                SET is_used = 0, used_at = NULL 
                WHERE id = ? AND is_used = 1
            ");
            $updateStmt->execute([$row['id']]);
            return $updateStmt->rowCount() > 0;
        }
        return false;
    }
}
