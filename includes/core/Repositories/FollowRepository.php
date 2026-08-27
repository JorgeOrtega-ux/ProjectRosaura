<?php

namespace App\Core\Repositories;

use App\Config\Database\DatabaseManager;
use App\Core\Interfaces\FollowRepositoryInterface;
use App\Core\Interfaces\NotificationRepositoryInterface;
use App\Core\System\DatabaseConstants as DB;
use App\Core\Helpers\Utils;
use PDO;

class FollowRepository implements FollowRepositoryInterface {
    private DatabaseManager $dbManager;
    private NotificationRepositoryInterface $notificationRepo;
    private PDO $pdo;

    public function __construct(DatabaseManager $dbManager, NotificationRepositoryInterface $notificationRepo) {
        $this->dbManager = $dbManager;
        $this->notificationRepo = $notificationRepo;
        $this->pdo = $this->dbManager->getConnection(DB::CONN_IDENTITY);
    }

    public function toggleFollow(int $followerId, int $followingId): array {
        $trans = function(string $key, string $fallback = '') {
            return function_exists('__') ? __($key) : ($fallback ?: $key);
        };

        if ($followerId <= 0 || $followingId <= 0) {
            return ['success' => false, 'message' => $trans('error.invalid_parameters', 'Parámetros inválidos.')];
        }

        if ($followerId === $followingId) {
            return ['success' => false, 'message' => $trans('err_cannot_follow_self', 'No puedes seguirte a ti mismo.')];
        }

        $userStmt = $this->pdo->prepare("SELECT id FROM " . DB::TBL_USERS . " WHERE id = ? AND deletion_scheduled_at IS NULL LIMIT 1");
        $userStmt->execute([$followingId]);
        if (!$userStmt->fetch()) {
            return ['success' => false, 'message' => $trans('error.user_not_found', 'Usuario no encontrado.')];
        }

        $checkStmt = $this->pdo->prepare("SELECT id FROM " . DB::TBL_USER_FOLLOWS . " WHERE follower_id = ? AND following_id = ? LIMIT 1");
        $checkStmt->execute([$followerId, $followingId]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $delStmt = $this->pdo->prepare("DELETE FROM " . DB::TBL_USER_FOLLOWS . " WHERE follower_id = ? AND following_id = ?");
            $delStmt->execute([$followerId, $followingId]);
            $isFollowing = false;
            $message = $trans('msg_unfollow_success', 'Dejaste de seguir al usuario.');
        } else {
            $insStmt = $this->pdo->prepare("INSERT INTO " . DB::TBL_USER_FOLLOWS . " (follower_id, following_id) VALUES (?, ?)");
            $insStmt->execute([$followerId, $followingId]);
            $isFollowing = true;
            $message = $trans('msg_follow_success', 'Ahora sigues a este usuario.');

            try {
                $fStmt = $this->pdo->prepare("SELECT identifier, username FROM " . DB::TBL_USERS . " WHERE id = ? LIMIT 1");
                $fStmt->execute([$followerId]);
                $fUser = $fStmt->fetch(PDO::FETCH_ASSOC);
                $fHandle = $fUser['identifier'] ?? ($fUser['username'] ?? '');
                $this->notificationRepo->createNotification($followingId, $followerId, 'user_follow', $followerId, $fHandle);
            } catch (\Throwable $e) {
            }
        }

        $followersCount = $this->getFollowersCount($followingId);
        $followingCount = $this->getFollowingCount($followerId);

        return [
            'success' => true,
            'is_following' => $isFollowing,
            'followers_count' => $followersCount,
            'following_count' => $followingCount,
            'message' => $message
        ];
    }

    public function isFollowing(int $followerId, int $followingId): bool {
        if ($followerId <= 0 || $followingId <= 0 || $followerId === $followingId) {
            return false;
        }

        $stmt = $this->pdo->prepare("SELECT 1 FROM " . DB::TBL_USER_FOLLOWS . " WHERE follower_id = ? AND following_id = ? LIMIT 1");
        $stmt->execute([$followerId, $followingId]);
        return (bool)$stmt->fetchColumn();
    }

    public function getFollowersCount(int $userId): int {
        if ($userId <= 0) return 0;
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM " . DB::TBL_USER_FOLLOWS . " WHERE following_id = ?");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    public function getFollowingCount(int $userId): int {
        if ($userId <= 0) return 0;
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM " . DB::TBL_USER_FOLLOWS . " WHERE follower_id = ?");
        $stmt->execute([$userId]);
        return (int)$stmt->fetchColumn();
    }

    public function getFollowers(int $userId, ?int $viewerId, int $page = 1, int $limit = 20): array {
        if ($userId <= 0) return [];
        $page = max(1, $page);
        $limit = min(100, max(1, $limit));
        $offset = ($page - 1) * $limit;
        $viewerParam = $viewerId ?? 0;

        $sql = "SELECT u.id, u.uuid, u.username, u.identifier, u.profile_picture, u.banner_picture, u.bio, u.subscription_tier, r.name as role_name,
                       CASE WHEN vf.id IS NOT NULL THEN 1 ELSE 0 END as is_following,
                       (SELECT COUNT(*) FROM " . DB::TBL_USER_FOLLOWS . " fcnt WHERE fcnt.following_id = u.id) as followers_count
                FROM " . DB::TBL_USER_FOLLOWS . " uf
                JOIN " . DB::TBL_USERS . " u ON uf.follower_id = u.id
                LEFT JOIN " . DB::TBL_USER_ROLES . " ur ON u.id = ur.user_id
                LEFT JOIN " . DB::TBL_ROLES . " r ON ur.role_id = r.id
                LEFT JOIN " . DB::TBL_USER_FOLLOWS . " vf ON vf.follower_id = :viewer_id AND vf.following_id = u.id
                WHERE uf.following_id = :user_id AND u.deletion_scheduled_at IS NULL
                ORDER BY uf.created_at DESC
                LIMIT :limit_val OFFSET :offset_val";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':viewer_id', $viewerParam, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit_val', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset_val', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $this->formatUserRows($rows, $viewerId);
    }

    public function getFollowing(int $userId, ?int $viewerId, int $page = 1, int $limit = 20): array {
        if ($userId <= 0) return [];
        $page = max(1, $page);
        $limit = min(100, max(1, $limit));
        $offset = ($page - 1) * $limit;
        $viewerParam = $viewerId ?? 0;

        $sql = "SELECT u.id, u.uuid, u.username, u.identifier, u.profile_picture, u.banner_picture, u.bio, u.subscription_tier, r.name as role_name,
                       CASE WHEN vf.id IS NOT NULL THEN 1 ELSE 0 END as is_following,
                       (SELECT COUNT(*) FROM " . DB::TBL_USER_FOLLOWS . " fcnt WHERE fcnt.following_id = u.id) as followers_count
                FROM " . DB::TBL_USER_FOLLOWS . " uf
                JOIN " . DB::TBL_USERS . " u ON uf.following_id = u.id
                LEFT JOIN " . DB::TBL_USER_ROLES . " ur ON u.id = ur.user_id
                LEFT JOIN " . DB::TBL_ROLES . " r ON ur.role_id = r.id
                LEFT JOIN " . DB::TBL_USER_FOLLOWS . " vf ON vf.follower_id = :viewer_id AND vf.following_id = u.id
                WHERE uf.follower_id = :user_id AND u.deletion_scheduled_at IS NULL
                ORDER BY uf.created_at DESC
                LIMIT :limit_val OFFSET :offset_val";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':viewer_id', $viewerParam, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit_val', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset_val', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $this->formatUserRows($rows, $viewerId);
    }

    public function getFollowingStatusBatch(int $viewerId, array $userIds): array {
        if ($viewerId <= 0 || empty($userIds)) return [];

        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $stmt = $this->pdo->prepare("SELECT following_id FROM " . DB::TBL_USER_FOLLOWS . " WHERE follower_id = ? AND following_id IN ({$placeholders})");
        $stmt->execute(array_merge([$viewerId], $userIds));
        $followingIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $result = [];
        $followingMap = array_flip($followingIds);
        foreach ($userIds as $uid) {
            $result[$uid] = isset($followingMap[$uid]);
        }
        return $result;
    }

    private function formatUserRows(array $rows, ?int $viewerId): array {
        $users = [];
        foreach ($rows as $r) {
            $identifier = !empty($r['identifier']) ? $r['identifier'] : strtolower(str_replace(' ', '_', $r['username']));
            $users[] = [
                'id' => (int)$r['id'],
                'uuid' => $r['uuid'],
                'username' => $r['username'],
                'identifier' => $identifier,
                'handle' => '@' . $identifier,
                'avatar_url' => Utils::getS3PublicUrl($r['profile_picture']),
                'banner_url' => !empty($r['banner_picture']) ? Utils::getS3PublicUrl($r['banner_picture']) : Utils::getDefaultBannerForUser((int)$r['id']),
                'bio' => $r['bio'] ?? '',
                'subscription_tier' => (int)($r['subscription_tier'] ?? 0),
                'role_name' => $r['role_name'] ?? 'User',
                'followers_count' => (int)($r['followers_count'] ?? 0),
                'is_following' => !empty($r['is_following']),
                'is_self' => $viewerId !== null && (int)$viewerId === (int)$r['id']
            ];
        }
        return $users;
    }
}
?>