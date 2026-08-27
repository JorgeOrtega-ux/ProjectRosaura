<?php

namespace App\Core\Interfaces;

interface NotificationRepositoryInterface {
    public function createNotification(int $userId, ?int $actorId, string $type, ?int $targetId = null, ?string $targetUuid = null, ?array $data = null): bool;
    public function getUserNotifications(int $userId, int $page = 1, int $limit = 20): array;
    public function getUnreadCount(int $userId): int;
    public function markAsRead(int $notificationId, int $userId): bool;
    public function markAllAsRead(int $userId): bool;
}
?>