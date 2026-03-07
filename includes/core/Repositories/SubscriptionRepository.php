<?php
// includes/core/Repositories/SubscriptionRepository.php
namespace App\Core\Repositories;

use PDO;
use App\Core\Interfaces\SubscriptionRepositoryInterface;

class SubscriptionRepository implements SubscriptionRepositoryInterface {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function toggleSubscription(int $subscriberId, int $channelId): bool {
        if ($subscriberId === $channelId) {
            return false; // No puedes suscribirte a ti mismo
        }

        if ($this->isSubscribed($subscriberId, $channelId)) {
            $stmt = $this->db->prepare("DELETE FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?");
            $stmt->execute([$subscriberId, $channelId]);
            return false; // Desuscrito
        } else {
            $stmt = $this->db->prepare("INSERT INTO subscriptions (subscriber_id, channel_id) VALUES (?, ?)");
            $stmt->execute([$subscriberId, $channelId]);
            return true; // Suscrito
        }
    }

    public function isSubscribed(int $subscriberId, int $channelId): bool {
        $stmt = $this->db->prepare("SELECT 1 FROM subscriptions WHERE subscriber_id = ? AND channel_id = ? LIMIT 1");
        $stmt->execute([$subscriberId, $channelId]);
        return (bool) $stmt->fetchColumn();
    }

    public function getSubscriberCount(int $channelId): int {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM subscriptions WHERE channel_id = ?");
        $stmt->execute([$channelId]);
        return (int) $stmt->fetchColumn();
    }
}
?>