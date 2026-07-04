<?php
// includes/core/Interfaces/SubscriptionRepositoryInterface.php

namespace App\Core\Interfaces;

interface SubscriptionRepositoryInterface {
    public function createSubscription(array $data): int;
    public function findActiveByUserId(int $userId): ?array;
    public function updateByCheckoutSessionId(string $sessionId, array $data): bool;
    public function updateByStripeSubscriptionId(string $stripeSubId, array $data): bool;
    public function findByCheckoutSessionId(string $sessionId): ?array;
    public function findByStripeSubscriptionId(string $stripeSubId): ?array;
    public function createPaymentRecord(array $data): int;
    public function getPaymentHistory(int $userId, int $limit = 20, int $offset = 0): array;
    public function updateUserTier(int $userId, int $tier): bool;
    public function updateUserStripeCustomerId(int $userId, string $customerId): bool;
    public function getStripeCustomerIdByUserId(int $userId): ?string;
}
?>
