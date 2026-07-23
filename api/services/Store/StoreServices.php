<?php
namespace App\Api\Services\Store;

use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\StoreRepositoryInterface;
use App\Core\System\Logger;

class StoreServices {

    private $sessionManager;
    private $storeRepo;

    private const PERK_PRICES = [
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
        try {
            $redisInstance = new \App\Config\Database\RedisCache();
            $redisClient = $redisInstance->getClient();
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

        $price = self::PERK_PRICES[$perkId];
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
        
        if (empty($perkId) || !isset(self::PERK_PRICES[$perkId])) {
            return ['success' => false, 'message_key' => 'store.invalid_perk'];
        }

        try {
            $redisInstance = new \App\Config\Database\RedisCache();
            $redis = $redisInstance->getClient();
            
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

        return ['success' => false, 'message_key' => 'store.bomb_perks_use_direct'];

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
