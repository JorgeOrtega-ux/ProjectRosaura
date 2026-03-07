<?php
// includes/core/Interfaces/SubscriptionRepositoryInterface.php
namespace App\Core\Interfaces;

interface SubscriptionRepositoryInterface {
    public function toggleSubscription(int $subscriberId, int $channelId): bool;
    public function isSubscribed(int $subscriberId, int $channelId): bool;
    public function getSubscriberCount(int $channelId): int;
}
?>