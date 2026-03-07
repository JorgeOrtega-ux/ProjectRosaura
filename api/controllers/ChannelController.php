<?php
// api/controllers/ChannelController.php
namespace App\Api\Controllers;

use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;

class ChannelController {
    private SubscriptionRepositoryInterface $subscriptionRepo;
    private UserRepositoryInterface $userRepo;

    public function __construct(SubscriptionRepositoryInterface $subscriptionRepo, UserRepositoryInterface $userRepo) {
        $this->subscriptionRepo = $subscriptionRepo;
        $this->userRepo = $userRepo;
    }

    public function toggle_subscription($data) {
        if (!isset($_SESSION['user_id'])) {
            return ['success' => false, 'message' => 'Debes iniciar sesión para suscribirte.'];
        }

        $subscriberId = $_SESSION['user_id'];
        $channelUsername = $data['username'] ?? '';

        if (empty($channelUsername)) {
            return ['success' => false, 'message' => 'Canal no especificado.'];
        }

        $channelUser = $this->userRepo->findByUsername($channelUsername);
        if (!$channelUser) {
            return ['success' => false, 'message' => 'El canal no existe.'];
        }

        $channelId = $channelUser['id'];

        if ($subscriberId === $channelId) {
            return ['success' => false, 'message' => 'No puedes suscribirte a tu propio canal.'];
        }

        $isSubscribed = $this->subscriptionRepo->toggleSubscription($subscriberId, $channelId);
        $newCount = $this->subscriptionRepo->getSubscriberCount($channelId);

        return [
            'success' => true,
            'is_subscribed' => $isSubscribed,
            'subscriber_count' => $newCount
        ];
    }
}
?>