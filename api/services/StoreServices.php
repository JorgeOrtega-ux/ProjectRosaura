<?php
namespace App\Api\Services;

use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\StoreRepositoryInterface;
use App\Core\System\Logger;

class StoreServices {

    private $sessionManager;
    private $storeRepo;

    // Define available perks and their coin prices
    private const PERK_PRICES = [
        'no_cooldown_10s' => 1500,
        'pixel_protection_25' => 3000
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

        $price = self::PERK_PRICES[$perkId];
        $currentCoins = $this->storeRepo->getCoins($userId);

        if ($currentCoins < $price) {
            return ['success' => false, 'message_key' => 'store.insufficient_coins'];
        }

        // Deduct coins
        if ($this->storeRepo->deductCoins($userId, $price)) {
            // Add perk
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
}
