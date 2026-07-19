<?php
namespace App\Api\Services\Store;

use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\StoreRepositoryInterface;
use App\Core\System\Logger;

class StoreServices {

    private $sessionManager;
    private $storeRepo;

    private const PERK_PRICES = [
        'no_cooldown_10s' => 1500,
        'pixel_protection_25' => 3000,
        'elite_eraser_25' => 5000,
        'pixel_misil_1' => 2000,
        'bomba_pixel_1' => 5000,
        'bomba_atomica_1' => 25000,
        'bomba_racimo_1' => 15000,
        'lluvia_meteoritos_1' => 45000
    ];

    public function __construct(
        SessionManagerInterface $sessionManager,
        StoreRepositoryInterface $storeRepo
    ) {
        $this->sessionManager = $sessionManager;
        $this->storeRepo = $storeRepo;
    }

    public function buyPerk(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $perkId = $input['perk_id'] ?? '';

        if (empty($perkId) || !isset(self::PERK_PRICES[$perkId])) {
            return ['success' => false, 'message_key' => 'store.invalid_perk'];
        }

        $idempotencyKey = $input['idempotency_key'] ?? '';
        $redisClient = null;
        if (!empty($idempotencyKey)) {
            try {
                $redisInstance = new \App\Config\Database\RedisCache();
                $redisClient = $redisInstance->getClient();
                $lockKey = "idem:buy_perk:{$userId}:{$idempotencyKey}";
                // Lock for 1 hour to prevent duplicate clicks
                if (!$redisClient->setnx($lockKey, "1")) {
                    Logger::info("Idempotent hit blocked in buyPerk", ['user_id' => $userId, 'key' => $idempotencyKey]);
                    // Return a fake success so the UI doesn't crash on duplicate clicks
                    return [
                        'success' => true,
                        'message_key' => 'store.perk_purchased',
                        'new_balance' => $this->storeRepo->getCoins($userId)
                    ];
                }
                $redisClient->expire($lockKey, 3600);
            } catch (\Throwable $e) {
                Logger::error("Redis Error en idempotencia: " . $e->getMessage());
            }
        }

        $price = self::PERK_PRICES[$perkId];
        $currentCoins = $this->storeRepo->getCoins($userId);

        if ($currentCoins < $price) {
            return ['success' => false, 'message_key' => 'store.insufficient_coins'];
        }

        if ($this->storeRepo->deductCoins($userId, $price)) {
            
            $this->storeRepo->addPerkToUser($userId, $perkId, $price);
            
            Logger::info("User bought perk", [
                'user_id' => $userId,
                'perk_id' => $perkId,
                'price' => $price
            ]);

            return [
                'success' => true,
                'message_key' => 'store.perk_purchased',
                'new_balance' => $currentCoins - $price
            ];
        }

        return ['success' => false, 'message_key' => 'store.purchase_failed'];
    }

    public function getBalance(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            http_response_code(401);
            return ['success' => false, 'message_key' => 'error.unauthorized'];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        $coins = $this->storeRepo->getCoins($userId);

        return [
            'success' => true,
            'coins' => $coins
        ];
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
                $perk['description'] = 'Sin descripción';
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
        
        if (empty($perkId) || !isset(self::PERK_PRICES[$perkId])) {
            return ['success' => false, 'message_key' => 'store.invalid_perk'];
        }

        try {
            $redisInstance = new \App\Config\Database\RedisCache();
            $redis = $redisInstance->getClient();
                        if ($perkId === 'no_cooldown_10s') {
                $key = "user:{$userId}:perk:no_cooldown";
                if ($redis->exists($key)) {
                    return ['success' => false, 'message_key' => 'err_perk_already_active'];
                }
            } elseif ($perkId === 'pixel_protection_25') {
                $key = "user:{$userId}:perk:protection";
                if ($redis->exists($key) && (int)$redis->get($key) > 0) {
                    return ['success' => false, 'message_key' => 'err_perk_already_active'];
                }
            } elseif ($perkId === 'elite_eraser_25') {
                $key = "user:{$userId}:perk:eraser";
                if ($redis->exists($key) && (int)$redis->get($key) > 0) {
                    return ['success' => false, 'message_key' => 'err_perk_already_active'];
                }
            } elseif (in_array($perkId, ['pixel_misil_1', 'bomba_pixel_1', 'bomba_atomica_1', 'bomba_racimo_1', 'lluvia_meteoritos_1'])) {
                return ['success' => false, 'message_key' => 'store.bomb_perks_use_direct'];
            }
        } catch (\Throwable $e) {
            Logger::error("Redis Error en activatePerk (Check): " . $e->getMessage());
            return ['success' => false, 'message_key' => 'error.server_error'];
        }

        if (!$this->storeRepo->markPerkAsUsed($userId, $perkId)) {
            return ['success' => false, 'message_key' => 'store.perk_not_owned'];
        }

        try {
            if (isset($redis)) {
                $perksConfigPath = __DIR__ . '/../../../public/assets/data/perks.json';
                $perksConfig = [];
                if (file_exists($perksConfigPath)) {
                    $perksConfig = json_decode(file_get_contents($perksConfigPath), true) ?: [];
                }

                if ($perkId === 'no_cooldown_10s') {
                    $duration = $perksConfig['no_cooldown_10s']['duration_seconds'] ?? 10;
                    $key = "user:{$userId}:perk:no_cooldown";
                    $redis->setex($key, $duration, "1"); 
                } elseif ($perkId === 'pixel_protection_25') {
                    $duration = $perksConfig['pixel_protection_25']['duration_seconds'] ?? 86400;
                    $amount = $perksConfig['pixel_protection_25']['amount'] ?? 25;
                    $key = "user:{$userId}:perk:protection";
                    $redis->setex($key, $duration, (string)$amount);
                } elseif ($perkId === 'elite_eraser_25') {
                    $duration = $perksConfig['elite_eraser_25']['duration_seconds'] ?? 86400;
                    $amount = $perksConfig['elite_eraser_25']['amount'] ?? 25;
                    $key = "user:{$userId}:perk:eraser";
                    $redis->setex($key, $duration, (string)$amount);
                }
            }
        } catch (\Throwable $e) {
            Logger::error("Redis Error en activatePerk (Set): " . $e->getMessage());
            // Rollback the perk consumption since Redis failed to assign the benefit
            $this->storeRepo->refundPerk($userId, $perkId);
            return ['success' => false, 'message_key' => 'error.server_error'];
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
