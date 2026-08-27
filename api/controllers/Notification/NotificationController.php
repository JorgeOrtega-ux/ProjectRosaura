<?php

namespace App\Api\Controllers\Notification;

use App\Api\Controllers\BaseController;
use App\Core\Interfaces\NotificationRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;

class NotificationController extends BaseController {
    private NotificationRepositoryInterface $notificationRepo;
    private SessionManagerInterface $sessionManager;

    public function __construct(
        NotificationRepositoryInterface $notificationRepo,
        SessionManagerInterface $sessionManager
    ) {
        $this->notificationRepo = $notificationRepo;
        $this->sessionManager = $sessionManager;
    }

    public function get_notifications($input) {
        try {
            if (!$this->sessionManager->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('error.unauthorized')]);
            }

            $userId = (int)$this->sessionManager->getActiveAccountId();
            if ($userId <= 0) {
                return $this->respond(['success' => false, 'message' => __('error.unauthorized')]);
            }

            $page = max(1, (int)($input['page'] ?? 1));
            $limit = min(50, max(1, (int)($input['limit'] ?? 20)));

            $notifications = $this->notificationRepo->getUserNotifications($userId, $page, $limit);
            $unreadCount = $this->notificationRepo->getUnreadCount($userId);

            return $this->respond([
                'success' => true,
                'data' => $notifications,
                'unread_count' => $unreadCount,
                'page' => $page,
                'per_page' => $limit
            ]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_unread_count($input) {
        try {
            if (!$this->sessionManager->isLoggedIn()) {
                return $this->respond(['success' => true, 'unread_count' => 0]);
            }

            $userId = (int)$this->sessionManager->getActiveAccountId();
            if ($userId <= 0) {
                return $this->respond(['success' => true, 'unread_count' => 0]);
            }

            $unreadCount = $this->notificationRepo->getUnreadCount($userId);

            return $this->respond([
                'success' => true,
                'unread_count' => $unreadCount
            ]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function mark_as_read($input) {
        try {
            if (!$this->sessionManager->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('error.unauthorized')]);
            }

            $userId = (int)$this->sessionManager->getActiveAccountId();
            if ($userId <= 0) {
                return $this->respond(['success' => false, 'message' => __('error.unauthorized')]);
            }

            $notifId = (int)($input['id'] ?? ($input['notification_id'] ?? 0));
            if ($notifId <= 0) {
                return $this->respond(['success' => false, 'message' => __('error.invalid_parameters')]);
            }

            $success = $this->notificationRepo->markAsRead($notifId, $userId);
            $unreadCount = $this->notificationRepo->getUnreadCount($userId);

            return $this->respond([
                'success' => $success,
                'unread_count' => $unreadCount
            ]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function mark_all_as_read($input) {
        try {
            if (!$this->sessionManager->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('error.unauthorized')]);
            }

            $userId = (int)$this->sessionManager->getActiveAccountId();
            if ($userId <= 0) {
                return $this->respond(['success' => false, 'message' => __('error.unauthorized')]);
            }

            $success = $this->notificationRepo->markAllAsRead($userId);

            return $this->respond([
                'success' => $success,
                'unread_count' => 0,
                'message' => __('notifications.mark_all_success')
            ]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>