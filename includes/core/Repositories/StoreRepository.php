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
        if ($redisCache === null) {
            try {
                $redisCache = new RedisCache();
            } catch (\Throwable $e) {}
        }
        $this->redisClient = $redisCache ? $redisCache->getClient() : null;
    }

    public function addCoins(int $userId, int $amount): bool {
        $stmt = $this->db->prepare("UPDATE users SET coins = coins + ? WHERE id = ?");
        $res = $stmt->execute([$amount, $userId]);
        if ($res && $this->redisClient) {
            $this->redisClient->del(CacheConstants::PREFIX_STORE_COINS . $userId);
            $this->redisClient->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
        }
        return $res;
    }

    public function deductCoins(int $userId, int $amount): bool {
        $stmt = $this->db->prepare("UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?");
        $stmt->execute([$amount, $userId, $amount]);
        $res = $stmt->rowCount() > 0;
        if ($res && $this->redisClient) {
            $this->redisClient->del(CacheConstants::PREFIX_STORE_COINS . $userId);
            $this->redisClient->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
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
        return $this->processCoinPurchaseSession($data);
    }

    public function processCoinPurchaseSession(array $data): bool {
        $sessionId = $data['stripe_checkout_session_id'] ?? null;
        if (!$sessionId) return false;

        try {
            $this->db->beginTransaction();

            if ($this->hasProcessedStripeSession($sessionId)) {
                $this->db->rollBack();
                return false;
            }

            $stmt = $this->db->prepare("
                INSERT INTO store_purchases 
                (user_id, stripe_payment_intent_id, stripe_checkout_session_id, item_type, item_amount, amount_cents, currency, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['user_id'],
                $data['stripe_payment_intent_id'] ?? null,
                $sessionId,
                $data['item_type'],
                $data['item_amount'],
                $data['amount_cents'],
                $data['currency'] ?? 'usd',
                $data['status'] ?? 'succeeded'
            ]);

            $stmtAdd = $this->db->prepare("UPDATE users SET coins = coins + ? WHERE id = ?");
            $stmtAdd->execute([$data['item_amount'], $data['user_id']]);

            $this->db->commit();

            if ($this->redisClient) {
                $this->redisClient->del(CacheConstants::PREFIX_STORE_COINS . $data['user_id']);
                $this->redisClient->del(CacheConstants::PREFIX_USER_PROFILE . $data['user_id']);
            }
            return true;
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            \App\Core\System\Logger::error("Error procesando compra de monedas: " . $e->getMessage());
            return false;
        }
    }

    public function purchasePerkAtomic(int $userId, string $perkId, int $price): array {
        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT coins FROM users WHERE id = ? FOR UPDATE");
            $stmt->execute([$userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $currentCoins = $row ? (int)$row['coins'] : 0;

            if ($currentCoins < $price) {
                $this->db->rollBack();
                return ['success' => false, 'message_key' => 'store.insufficient_coins'];
            }

            $deductStmt = $this->db->prepare("UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?");
            $deductStmt->execute([$price, $userId, $price]);
            if ($deductStmt->rowCount() === 0) {
                $this->db->rollBack();
                return ['success' => false, 'message_key' => 'store.insufficient_coins'];
            }

            $perkStmt = $this->db->prepare("INSERT INTO user_perks (user_id, perk_id, coins_spent) VALUES (?, ?, ?)");
            $perkStmt->execute([$userId, $perkId, $price]);

            $balanceStmt = $this->db->prepare("
                INSERT INTO user_perk_balances (user_id, perk_id, quantity_available) 
                VALUES (?, ?, 1) 
                ON DUPLICATE KEY UPDATE quantity_available = quantity_available + 1
            ");
            $balanceStmt->execute([$userId, $perkId]);

            $this->db->commit();

            if ($this->redisClient) {
                $this->redisClient->del(CacheConstants::PREFIX_STORE_COINS . $userId);
            }

            return [
                'success' => true,
                'message_key' => 'store.perk_purchased',
                'new_balance' => $currentCoins - $price
            ];
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            \App\Core\System\Logger::error("Error atómico en purchasePerkAtomic: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'store.purchase_failed'];
        }
    }

    public function purchasePerksBulkAtomic(int $userId, array $perkItems): array {
        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT coins FROM users WHERE id = ? FOR UPDATE");
            $stmt->execute([$userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $currentCoins = $row ? (int)$row['coins'] : 0;

            $totalPrice = 0;
            foreach ($perkItems as $item) {
                $totalPrice += (int)($item['price'] ?? 0);
            }

            if ($currentCoins < $totalPrice) {
                $this->db->rollBack();
                return ['success' => false, 'message_key' => 'store.insufficient_coins'];
            }

            $deductStmt = $this->db->prepare("UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?");
            $deductStmt->execute([$totalPrice, $userId, $totalPrice]);
            if ($deductStmt->rowCount() === 0) {
                $this->db->rollBack();
                return ['success' => false, 'message_key' => 'store.insufficient_coins'];
            }

            $perkStmt = $this->db->prepare("INSERT INTO user_perks (user_id, perk_id, coins_spent) VALUES (?, ?, ?)");
            $balanceStmt = $this->db->prepare("
                INSERT INTO user_perk_balances (user_id, perk_id, quantity_available) 
                VALUES (?, ?, 1) 
                ON DUPLICATE KEY UPDATE quantity_available = quantity_available + 1
            ");
            foreach ($perkItems as $item) {
                $perkId = $item['id'];
                $price = (int)($item['price'] ?? 0);
                $perkStmt->execute([$userId, $perkId, $price]);
                $balanceStmt->execute([$userId, $perkId]);
            }

            $this->db->commit();

            if ($this->redisClient) {
                $this->redisClient->del(CacheConstants::PREFIX_STORE_COINS . $userId);
                $this->redisClient->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
            }

            $newBalance = $currentCoins - $totalPrice;

            return [
                'success' => true,
                'message_key' => 'store.bulk_purchased',
                'items_count' => count($perkItems),
                'total_spent' => $totalPrice,
                'new_balance' => $newBalance
            ];
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            \App\Core\System\Logger::error("Error atómico en purchasePerksBulkAtomic: " . $e->getMessage());
            return ['success' => false, 'message_key' => 'store.purchase_failed'];
        }
    }

    public function addPerkToUser(int $userId, string $perkId, int $coinsSpent = 0): bool {
        try {
            $this->db->beginTransaction();
            $stmt = $this->db->prepare("
                INSERT INTO user_perks (user_id, perk_id, coins_spent) 
                VALUES (?, ?, ?)
            ");
            $res = $stmt->execute([$userId, $perkId, $coinsSpent]);
            if ($res) {
                $balanceStmt = $this->db->prepare("
                    INSERT INTO user_perk_balances (user_id, perk_id, quantity_available) 
                    VALUES (?, ?, 1) 
                    ON DUPLICATE KEY UPDATE quantity_available = quantity_available + 1
                ");
                $balanceStmt->execute([$userId, $perkId]);
            }
            $this->db->commit();
            return $res;
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return false;
        }
    }

    public function getUserPerks(int $userId): array {
        $stmt = $this->db->prepare("SELECT * FROM user_perks WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUnusedPerks(int $userId): array {
        $stmt = $this->db->prepare("
            SELECT perk_id, quantity_available as count 
            FROM user_perk_balances 
            WHERE user_id = ? AND quantity_available > 0
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function markPerkAsUsed(int $userId, string $perkId): bool {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                UPDATE user_perks 
                SET is_used = 1, used_at = NOW() 
                WHERE user_id = ? AND perk_id = ? AND is_used = 0 
                ORDER BY created_at ASC LIMIT 1
            ");
            $stmt->execute([$userId, $perkId]);
            if ($stmt->rowCount() > 0) {
                $balanceStmt = $this->db->prepare("
                    UPDATE user_perk_balances 
                    SET quantity_available = GREATEST(0, quantity_available - 1) 
                    WHERE user_id = ? AND perk_id = ?
                ");
                $balanceStmt->execute([$userId, $perkId]);
                $this->db->commit();
                return true;
            }
            $this->db->rollBack();
            return false;
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return false;
        }
    }

    public function refundPerk(int $userId, string $perkId): bool {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("
                UPDATE user_perks 
                SET is_used = 0, used_at = NULL 
                WHERE user_id = ? AND perk_id = ? AND is_used = 1 
                ORDER BY used_at DESC LIMIT 1
            ");
            $stmt->execute([$userId, $perkId]);
            if ($stmt->rowCount() > 0) {
                $balanceStmt = $this->db->prepare("
                    INSERT INTO user_perk_balances (user_id, perk_id, quantity_available) 
                    VALUES (?, ?, 1) 
                    ON DUPLICATE KEY UPDATE quantity_available = quantity_available + 1
                ");
                $balanceStmt->execute([$userId, $perkId]);
                $this->db->commit();
                return true;
            }
            $this->db->rollBack();
            return false;
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return false;
        }
    }
}
