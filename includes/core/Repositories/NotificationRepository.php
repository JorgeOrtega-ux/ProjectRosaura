<?php

namespace App\Core\Repositories;

use App\Config\Database\DatabaseManager;
use App\Core\Interfaces\NotificationRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;

class NotificationRepository implements NotificationRepositoryInterface {
    private PDO $pdo;

    public function __construct(DatabaseManager $dbManager) {
        $this->pdo = $dbManager->getConnection(DB::CONN_IDENTITY);
    }

    public function createNotification(int $userId, ?int $actorId, string $type, ?int $targetId = null, ?string $targetUuid = null, ?array $data = null): bool {
        if ($userId <= 0) return false;
        if ($actorId !== null && $userId === $actorId) return false;

        try {
            if ($actorId !== null && $targetId !== null) {
                $checkStmt = $this->pdo->prepare("
                    SELECT id FROM " . DB::TBL_NOTIFICATIONS . "
                    WHERE user_id = ? AND actor_id = ? AND type = ? AND target_id = ? AND is_read = 0
                    LIMIT 1
                ");
                $checkStmt->execute([$userId, $actorId, $type, $targetId]);
                if ($checkStmt->fetch()) {
                    return true;
                }
            }

            $jsonData = !empty($data) ? json_encode($data, JSON_UNESCAPED_UNICODE) : null;
            $stmt = $this->pdo->prepare("
                INSERT INTO " . DB::TBL_NOTIFICATIONS . " 
                (user_id, actor_id, type, target_id, target_uuid, data, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
            ");
            return $stmt->execute([$userId, $actorId, $type, $targetId, $targetUuid, $jsonData]);
        } catch (\Throwable $e) {
            Logger::error("Error creating notification: " . $e->getMessage());
            return false;
        }
    }

    public function getUserNotifications(int $userId, int $page = 1, int $limit = 20): array {
        if ($userId <= 0) return [];
        $page = max(1, $page);
        $limit = min(50, max(1, $limit));
        $offset = ($page - 1) * $limit;

        try {
            $sql = "
                SELECT n.id, n.user_id, n.actor_id, n.type, n.target_id, n.target_uuid, n.data, n.is_read, n.created_at,
                       u.username as actor_username, u.identifier as actor_identifier, u.profile_picture as actor_avatar,
                       u.subscription_tier as actor_tier, st.color as actor_color,
                       (SELECT r.name FROM " . DB::TBL_USER_ROLES . " ur JOIN " . DB::TBL_ROLES . " r ON ur.role_id = r.id WHERE ur.user_id = u.id ORDER BY r.id DESC LIMIT 1) as actor_role
                FROM " . DB::TBL_NOTIFICATIONS . " n
                LEFT JOIN " . DB::TBL_USERS . " u ON n.actor_id = u.id
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                WHERE n.user_id = :user_id
                ORDER BY n.created_at DESC
                LIMIT :limit_val OFFSET :offset_val
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit_val', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset_val', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $notifications = [];

            foreach ($rows as $r) {
                $data = !empty($r['data']) ? json_decode($r['data'], true) : [];
                $actorName = $r['actor_username'] ?? 'Usuario';
                $actorIdentifier = $r['actor_identifier'] ?? strtolower(str_replace(' ', '_', $actorName));
                $actorAvatar = Utils::getS3PublicUrl($r['actor_avatar'] ?? '');
                $actorSubBg = Utils::formatSubscriptionBg($r['actor_color'] ?? '');
                $title = $data['title'] ?? '';

                $targetUrl = '/';
                $actionIcon = 'notifications';
                $messageKey = 'notifications.title';

                if ($r['type'] === 'user_follow') {
                    $targetUrl = '/@' . $actorIdentifier;
                    $actionIcon = 'person_add';
                    $messageKey = 'notifications.user_follow';
                } elseif ($r['type'] === 'publication_like') {
                    $targetUrl = '/publication/' . ($r['target_uuid'] ?? '');
                    $actionIcon = 'favorite';
                    $messageKey = 'notifications.publication_like';
                } elseif ($r['type'] === 'publication_comment') {
                    $targetUrl = '/publication/' . ($r['target_uuid'] ?? '');
                    $actionIcon = 'chat';
                    $messageKey = 'notifications.publication_comment';
                } elseif ($r['type'] === 'canvas_invite') {
                    $targetUrl = '/design/' . ($r['target_uuid'] ?? '');
                    $actionIcon = 'palette';
                    $messageKey = 'notifications.canvas_invite';
                }

                $notifications[] = [
                    'id' => (int)$r['id'],
                    'type' => $r['type'],
                    'target_id' => $r['target_id'] !== null ? (int)$r['target_id'] : null,
                    'target_uuid' => $r['target_uuid'],
                    'target_url' => $targetUrl,
                    'is_read' => (bool)$r['is_read'],
                    'created_at' => $r['created_at'],
                    'message_key' => $messageKey,
                    'action_icon' => $actionIcon,
                    'params' => [
                        'actor' => $actorName,
                        'identifier' => $actorIdentifier,
                        'title' => $title,
                        'comment_snippet' => $data['comment_snippet'] ?? ''
                    ],
                    'actor' => [
                        'id' => $r['actor_id'] !== null ? (int)$r['actor_id'] : null,
                        'username' => $actorName,
                        'identifier' => $actorIdentifier,
                        'handle' => '@' . $actorIdentifier,
                        'avatar_url' => $actorAvatar,
                        'subscription_tier' => (int)($r['actor_tier'] ?? 0),
                        'subscription_bg' => $actorSubBg,
                        'role_name' => $r['actor_role'] ?? 'User'
                    ]
                ];
            }

            return $notifications;
        } catch (\Throwable $e) {
            Logger::error("Error fetching notifications: " . $e->getMessage());
            return [];
        }
    }

    public function getUnreadCount(int $userId): int {
        if ($userId <= 0) return 0;
        try {
            $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM " . DB::TBL_NOTIFICATIONS . " WHERE user_id = ? AND is_read = 0");
            $stmt->execute([$userId]);
            return (int)$stmt->fetchColumn();
        } catch (\Throwable $e) {
            Logger::error("Error getting unread count: " . $e->getMessage());
            return 0;
        }
    }

    public function markAsRead(int $notificationId, int $userId): bool {
        if ($notificationId <= 0 || $userId <= 0) return false;
        try {
            $stmt = $this->pdo->prepare("UPDATE " . DB::TBL_NOTIFICATIONS . " SET is_read = 1 WHERE id = ? AND user_id = ?");
            return $stmt->execute([$notificationId, $userId]);
        } catch (\Throwable $e) {
            Logger::error("Error marking notification as read: " . $e->getMessage());
            return false;
        }
    }

    public function markAllAsRead(int $userId): bool {
        if ($userId <= 0) return false;
        try {
            $stmt = $this->pdo->prepare("UPDATE " . DB::TBL_NOTIFICATIONS . " SET is_read = 1 WHERE user_id = ? AND is_read = 0");
            return $stmt->execute([$userId]);
        } catch (\Throwable $e) {
            Logger::error("Error marking all notifications as read: " . $e->getMessage());
            return false;
        }
    }
}
?>