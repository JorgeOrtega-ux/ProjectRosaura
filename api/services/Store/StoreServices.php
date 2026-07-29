<?php
namespace App\Api\Services\Store;

use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\StoreRepositoryInterface;
use App\Core\System\Logger;

class StoreServices {

    private $sessionManager;
    private $storeRepo;

    private function getPerkPrices(): array {
        $packages = \App\Core\System\StorePackagesConfig::getContentPackages();
        $prices = [];
        foreach ($packages as $id => $pkg) {
            $prices[$id] = (int)($pkg['price_coins'] ?? 0);
        }
        return $prices;
    }

    private $redisCache;

    public function __construct(
        SessionManagerInterface $sessionManager,
        StoreRepositoryInterface $storeRepo,
        \App\Config\Database\RedisCache $redisCache
    ) {
        $this->sessionManager = $sessionManager;
        $this->storeRepo = $storeRepo;
        $this->redisCache = $redisCache;
    }

    public function buyPerk(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $perkPrices = $this->getPerkPrices();

        // Bulk atomic purchase support
        if (!empty($input['perk_ids']) && is_array($input['perk_ids'])) {
            $perkItems = [];
            foreach ($input['perk_ids'] as $pId) {
                if (isset($perkPrices[$pId])) {
                    $perkItems[] = [
                        'id' => $pId,
                        'price' => $perkPrices[$pId]
                    ];
                }
            }

            if (empty($perkItems)) {
                return ['success' => false, 'message_key' => 'store.invalid_perk'];
            }

            $result = $this->storeRepo->purchasePerksBulkAtomic($userId, $perkItems);
            if ($result['success']) {
                Logger::info("User bought perks bulk atomically", [
                    'user_id' => $userId,
                    'items_count' => count($perkItems),
                    'total_spent' => $result['total_spent']
                ]);
            }
            return $result;
        }

        $perkId = $input['perk_id'] ?? '';

        if (empty($perkId) || !isset($perkPrices[$perkId])) {
            return ['success' => false, 'message_key' => 'store.invalid_perk'];
        }

        $idempotencyKey = $input['idempotency_key'] ?? '';
        $redisClient = null;
        try {
            $redisClient = $this->redisCache->getClient();
        } catch (\Throwable $e) {
            Logger::error("Redis Cache Error en buyPerk: " . $e->getMessage());
        }

        if ($redisClient) {
            // User concurrency lock for 3 seconds to prevent rapid automated clicks
            $userLockKey = "user_lock:buy_perk:{$userId}";
            if (!$redisClient->set($userLockKey, "1", 'EX', 3, 'NX')) {
                return ['success' => false, 'message_key' => 'error.too_many_requests'];
            }

            if (!empty($idempotencyKey)) {
                $lockKey = "idem:buy_perk:{$userId}:{$idempotencyKey}";
                if (!$redisClient->setnx($lockKey, "1")) {
                    Logger::info("Idempotent hit blocked in buyPerk", ['user_id' => $userId, 'key' => $idempotencyKey]);
                    return [
                        'success' => true,
                        'message_key' => 'store.perk_purchased',
                        'new_balance' => $this->storeRepo->getCoins($userId)
                    ];
                }
                $redisClient->expire($lockKey, 3600);
            }
        }

        $price = $perkPrices[$perkId];
        $result = $this->storeRepo->purchasePerkAtomic($userId, $perkId, $price);

        if ($result['success']) {
            Logger::info("User bought perk atomically", [
                'user_id' => $userId,
                'perk_id' => $perkId,
                'price' => $price
            ]);
        }

        return $result;
    }

    public function getBalance(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();

        $sessionId = $input['session_id'] ?? ($_GET['session_id'] ?? null);
        $purchasedCoins = 0;
        if ($sessionId) {
            try {
                \Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);
                $stripeSession = \Stripe\Checkout\Session::retrieve($sessionId);
                if ($stripeSession && $stripeSession->payment_status === 'paid') {
                    $metadata = $stripeSession->metadata;
                    if (isset($metadata->type) && $metadata->type === 'coins') {
                        $amountCoins = isset($metadata->amount) ? (int) $metadata->amount : 0;
                        if ($amountCoins > 0) {
                            $purchasedCoins = $amountCoins;
                            $processed = $this->storeRepo->processCoinPurchaseSession([
                                'user_id' => $userId,
                                'stripe_payment_intent_id' => $stripeSession->payment_intent ?? null,
                                'stripe_checkout_session_id' => $sessionId,
                                'item_type' => 'coins',
                                'item_amount' => $amountCoins,
                                'amount_cents' => $stripeSession->amount_total ?? 0,
                                'currency' => strtolower($stripeSession->currency ?? 'usd'),
                                'status' => 'succeeded'
                            ]);

                            if ($processed) {
                                try {
                                    $subRepo = new \App\Core\Repositories\SubscriptionRepository(new \App\Config\Database\DatabaseManager());
                                    $subRepo->createPaymentRecord([
                                        'user_id' => $userId,
                                        'stripe_payment_intent_id' => $stripeSession->payment_intent ?? null,
                                        'stripe_invoice_id' => null,
                                        'amount_cents' => $stripeSession->amount_total ?? 0,
                                        'currency' => strtolower($stripeSession->currency ?? 'usd'),
                                        'description' => "Purchase of {$amountCoins} coins",
                                        'status' => 'succeeded'
                                    ]);
                                } catch (\Throwable $e) {
                                    Logger::error("Failed to create payment record in StoreServices", ['user_id' => $userId, 'session_id' => $sessionId, 'exception' => $e]);
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                Logger::error("Stripe API Error retrieving coin session for balance check", ['session_id' => $sessionId, 'error' => $e->getMessage()]);
            }
        }

        $coins = $this->storeRepo->getCoins($userId);

        $resData = [
            'success' => true,
            'coins' => $coins
        ];
        if ($purchasedCoins > 0) {
            $resData['purchased_coins'] = $purchasedCoins;
        }

        return $resData;
    }

    public function getMyPerks(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $perks = $this->storeRepo->getUnusedPerks($userId);
        
        $contentPackages = \App\Core\System\StorePackagesConfig::getContentPackages();
        foreach ($perks as &$perk) {
            $perkId = $perk['perk_id'];
            if (isset($contentPackages[$perkId])) {
                $perk['description'] = $contentPackages[$perkId]['description'];
            } else {
                $perk['description'] = __('lbl_no_description');
            }
        }

        return [
            'success' => true,
            'data' => $perks
        ];
    }

    public function activatePerk(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $perkId = $input['perk_id'] ?? '';
        
        $perkPrices = $this->getPerkPrices();
        if (empty($perkId) || !isset($perkPrices[$perkId])) {
            return ['success' => false, 'message_key' => 'store.invalid_perk'];
        }

        try {
            $redis = $this->redisCache->getClient();
            
            $perksConfigPath = __DIR__ . '/../../../public/assets/data/perks.json';
            $perksConfig = [];
            if (file_exists($perksConfigPath)) {
                $perksConfig = json_decode(file_get_contents($perksConfigPath), true) ?: [];
            }
            $perkType = $perksConfig[$perkId]['type'] ?? '';

            if ($perkType === 'bomb') {
                return ['success' => false, 'message_key' => 'store.bomb_perks_use_direct'];
            }
        } catch (\Throwable $e) {
            Logger::error("Redis Error en activatePerk (Check): " . $e->getMessage());
            return ['success' => false, 'message_key' => 'error.server_error'];
        }

        $activated = $this->storeRepo->markPerkAsUsed($userId, $perkId);
        if (!$activated) {
            return ['success' => false, 'message_key' => 'store.perk_activation_failed'];
        }

        Logger::info("User activated perk", [
            'user_id' => $userId,
            'perk_id' => $perkId
        ]);

        return [
            'success' => true,
            'message_key' => 'store.perk_activated',
            'perk_id' => $perkId
        ];
    }
}
