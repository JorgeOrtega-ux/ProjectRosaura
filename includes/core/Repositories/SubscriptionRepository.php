<?php

namespace App\Core\Repositories;

use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
use App\Core\System\Logger;

class SubscriptionRepository implements SubscriptionRepositoryInterface {

    private $db;
    private $redisClient;

    public function __construct(DatabaseManager $db, RedisCache $redisCache = null) {
        $this->db = $db;
        $this->redisClient = $redisCache ? $redisCache->getClient() : null;
    }

    public function createSubscription(array $data): int {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $stmt = $pdo->prepare(
            "INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id, tier, billing_period, status, current_period_start, current_period_end)
             VALUES (:user_id, :stripe_customer_id, :stripe_subscription_id, :stripe_checkout_session_id, :tier, :billing_period, :status, :current_period_start, :current_period_end)"
        );
        $stmt->execute([
            ':user_id' => $data['user_id'],
            ':stripe_customer_id' => $data['stripe_customer_id'] ?? null,
            ':stripe_subscription_id' => $data['stripe_subscription_id'] ?? null,
            ':stripe_checkout_session_id' => $data['stripe_checkout_session_id'] ?? null,
            ':tier' => $data['tier'],
            ':billing_period' => $data['billing_period'],
            ':status' => $data['status'] ?? 'incomplete',
            ':current_period_start' => $data['current_period_start'] ?? null,
            ':current_period_end' => $data['current_period_end'] ?? null
        ]);
        return (int) $pdo->lastInsertId();
    }

    public function findActiveByUserId(int $userId): ?array {
        $cacheKey = CacheConstants::PREFIX_USER_SUBSCRIPTION . $userId;
        if ($this->redisClient) {
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    return json_decode($cached, true) ?: null;
                }
            } catch (\Throwable $e) {}
        }

        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $stmt = $pdo->prepare(
            "SELECT * FROM subscriptions WHERE user_id = :user_id AND status = 'active' ORDER BY created_at DESC LIMIT 1"
        );
        $stmt->execute([':user_id' => $userId]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        $result = $result ?: null;

        if ($this->redisClient) {
            try {
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_TEN_MINS, json_encode($result));
            } catch (\Throwable $e) {}
        }

        return $result;
    }

    public function updateByCheckoutSessionId(string $sessionId, array $data): bool {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $sets = [];
        $params = [':session_id' => $sessionId];
        foreach ($data as $key => $value) {
            $sets[] = "`{$key}` = :{$key}";
            $params[":{$key}"] = $value;
        }
        if (empty($sets)) return false;
        $sql = "UPDATE subscriptions SET " . implode(', ', $sets) . " WHERE stripe_checkout_session_id = :session_id";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($params);
        if ($result && isset($data['user_id']) && $this->redisClient) {
            try { $this->redisClient->del(CacheConstants::PREFIX_USER_SUBSCRIPTION . $data['user_id']); } catch (\Throwable $e) {}
        }
        return $result;
    }

    public function updateByStripeSubscriptionId(string $stripeSubId, array $data): bool {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $sets = [];
        $params = [':stripe_sub_id' => $stripeSubId];
        foreach ($data as $key => $value) {
            $sets[] = "`{$key}` = :{$key}";
            $params[":{$key}"] = $value;
        }
        if (empty($sets)) return false;
        $sql = "UPDATE subscriptions SET " . implode(', ', $sets) . " WHERE stripe_subscription_id = :stripe_sub_id";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($params);
        if ($result && isset($data['user_id']) && $this->redisClient) {
            try { $this->redisClient->del(CacheConstants::PREFIX_USER_SUBSCRIPTION . $data['user_id']); } catch (\Throwable $e) {}
        }
        return $result;
    }

    public function findByCheckoutSessionId(string $sessionId): ?array {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $stmt = $pdo->prepare("SELECT * FROM subscriptions WHERE stripe_checkout_session_id = :session_id LIMIT 1");
        $stmt->execute([':session_id' => $sessionId]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function findByStripeSubscriptionId(string $stripeSubId): ?array {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $stmt = $pdo->prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = :stripe_sub_id ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([':stripe_sub_id' => $stripeSubId]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function createPaymentRecord(array $data): int {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);

        if (!empty($data['stripe_invoice_id'])) {
            $check = $pdo->prepare("SELECT id FROM payment_history WHERE stripe_invoice_id = ? LIMIT 1");
            $check->execute([$data['stripe_invoice_id']]);
            if ($check->fetchColumn()) {
                return 0;
            }
        }

        if (!empty($data['stripe_payment_intent_id'])) {
            $check = $pdo->prepare("SELECT id FROM payment_history WHERE stripe_payment_intent_id = ? LIMIT 1");
            $check->execute([$data['stripe_payment_intent_id']]);
            if ($check->fetchColumn()) {
                return 0;
            }
        }

        $stmt = $pdo->prepare(
            "INSERT INTO payment_history (user_id, stripe_payment_intent_id, stripe_invoice_id, amount_cents, currency, description, status)
             VALUES (:user_id, :stripe_payment_intent_id, :stripe_invoice_id, :amount_cents, :currency, :description, :status)"
        );
        $stmt->execute([
            ':user_id' => $data['user_id'],
            ':stripe_payment_intent_id' => $data['stripe_payment_intent_id'] ?? null,
            ':stripe_invoice_id' => $data['stripe_invoice_id'] ?? null,
            ':amount_cents' => $data['amount_cents'],
            ':currency' => $data['currency'] ?? 'usd',
            ':description' => $data['description'] ?? null,
            ':status' => $data['status'] ?? 'succeeded'
        ]);
        $id = (int) $pdo->lastInsertId();

        // Invalidate payment history cache so next fetch reflects the new record
        if ($id && $this->redisClient) {
            try { $this->redisClient->del(CacheConstants::PREFIX_USER_PAYMENT_HISTORY . $data['user_id']); } catch (\Throwable $e) {}
        }

        return $id;
    }

    public function getPaymentHistory(int $userId, int $limit = 20, int $offset = 0): array {
        // Cache only the first default page to avoid key explosion
        $cacheKey = null;
        if ($this->redisClient && $offset === 0 && $limit === 20) {
            $cacheKey = CacheConstants::PREFIX_USER_PAYMENT_HISTORY . $userId;
            try {
                $cached = $this->redisClient->get($cacheKey);
                if ($cached !== null && $cached !== false) {
                    return json_decode($cached, true) ?? [];
                }
            } catch (\Throwable $e) {}
        }

        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $stmt = $pdo->prepare(
            "SELECT id, stripe_payment_intent_id, stripe_invoice_id, amount_cents, currency, description, status, created_at
             FROM payment_history WHERE user_id = :user_id ORDER BY created_at DESC LIMIT :lim OFFSET :off"
        );
        $stmt->bindValue(':user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        if ($cacheKey && $this->redisClient) {
            try {
                $this->redisClient->setex($cacheKey, CacheConstants::TTL_FIVE_MINS, json_encode($result));
            } catch (\Throwable $e) {}
        }

        return $result;
    }

    public function updateUserTier(int $userId, int $tier): bool {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $stmt = $pdo->prepare("UPDATE users SET subscription_tier = :tier WHERE id = :id");
        $result = $stmt->execute([':tier' => $tier, ':id' => $userId]);
        if ($result && $this->redisClient) {
            try {
                $this->redisClient->del(CacheConstants::PREFIX_USER_SUBSCRIPTION . $userId);
                $this->redisClient->del(CacheConstants::PREFIX_USER_PROFILE . $userId);
            } catch (\Throwable $e) {}
        }
        return $result;
    }

    public function updateUserStripeCustomerId(int $userId, string $customerId): bool {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $stmt = $pdo->prepare("UPDATE users SET stripe_customer_id = :cid WHERE id = :id");
        return $stmt->execute([':cid' => $customerId, ':id' => $userId]);
    }

    public function getStripeCustomerIdByUserId(int $userId): ?string {
        $pdo = $this->db->getConnection(DB::CONN_IDENTITY);
        $stmt = $pdo->prepare("SELECT stripe_customer_id FROM users WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row['stripe_customer_id'] ?? null;
    }
}
?>
