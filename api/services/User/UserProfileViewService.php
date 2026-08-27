<?php

namespace App\Api\Services\User;

use App\Config\Database\DatabaseManager;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\FollowRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\DatabaseConstants as DB;
use PDO;

class UserProfileViewService {
    private DatabaseManager $db;
    private UserRepositoryInterface $userRepository;
    private FollowRepositoryInterface $followRepository;
    private PDO $pdoIdentity;
    private PDO $pdoCanvases;

    public function __construct(
        DatabaseManager $db,
        UserRepositoryInterface $userRepository,
        FollowRepositoryInterface $followRepository
    ) {
        $this->db = $db;
        $this->userRepository = $userRepository;
        $this->followRepository = $followRepository;
        $this->pdoIdentity = $this->db->getConnection(DB::CONN_IDENTITY);
        $this->pdoCanvases = $this->db->getConnection(DB::CONN_CANVASES);
    }

    public function getProfileData(string $identifierOrUsername): ?array {
        if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
            session_start();
        }

        $viewerUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
        $cleanHandle = ltrim(trim($identifierOrUsername), '@');

        if (empty($cleanHandle)) {
            return null;
        }

        $user = $this->userRepository->findByIdentifier($cleanHandle);
        if (!$user) {
            $user = $this->userRepository->findByUsername($cleanHandle);
        }

        if (!$user) {
            return null;
        }

        $userId = (int)$user['id'];
        $isOwner = $viewerUserId === $userId;

        $stmtPubStats = $this->pdoCanvases->prepare("
            SELECT 
                COUNT(*) as total_publications,
                COALESCE(SUM(likes_count), 0) as total_likes_received,
                COALESCE(SUM(views_count), 0) as total_views_received
            FROM " . DB::TBL_PUBLICATIONS . "
            WHERE user_id = ? AND (privacy = 'public' OR ? = 1)
        ");
        $stmtPubStats->execute([$userId, $isOwner ? 1 : 0]);
        $pubStats = $stmtPubStats->fetch(PDO::FETCH_ASSOC) ?: [
            'total_publications' => 0,
            'total_likes_received' => 0,
            'total_views_received' => 0
        ];

        $stmtCanvasStats = $this->pdoCanvases->prepare("
            SELECT COUNT(*) as total_canvases
            FROM " . DB::TBL_CANVASES . "
            WHERE owner_id = ? AND deleted_at IS NULL AND (privacy = 'public' OR ? = 1)
        ");
        $stmtCanvasStats->execute([$userId, $isOwner ? 1 : 0]);
        $canvasStats = $stmtCanvasStats->fetch(PDO::FETCH_ASSOC) ?: ['total_canvases' => 0];

        $followersCount = $this->followRepository->getFollowersCount($userId);
        $followingCount = $this->followRepository->getFollowingCount($userId);
        $isFollowing = ($viewerUserId && !$isOwner) ? $this->followRepository->isFollowing($viewerUserId, $userId) : false;

        $stmtLive = $this->pdoCanvases->prepare("
            SELECT id, uuid, name, tags, size, is_online_active, members_count, favorites_count, created_at
            FROM " . DB::TBL_CANVASES . "
            WHERE owner_id = ? AND deleted_at IS NULL AND is_online_active = 1 AND privacy = 'public'
            ORDER BY last_online_at DESC, id DESC
            LIMIT 1
        ");
        $stmtLive->execute([$userId]);
        $liveCanvas = $stmtLive->fetch(PDO::FETCH_ASSOC);

        $liveCanvasFormatted = null;
        if ($liveCanvas) {
            $tags = [];
            if (!empty($liveCanvas['tags'])) {
                $decoded = is_array($liveCanvas['tags']) ? $liveCanvas['tags'] : json_decode($liveCanvas['tags'], true);
                if (is_array($decoded)) $tags = $decoded;
            }

            $liveCanvasFormatted = [
                'id' => (int)$liveCanvas['id'],
                'uuid' => $liveCanvas['uuid'],
                'name' => $liveCanvas['name'],
                'size' => $liveCanvas['size'],
                'tags' => $tags,
                'members_count' => (int)$liveCanvas['members_count'],
                'favorites_count' => (int)$liveCanvas['favorites_count'],
                'url' => '/design/' . $liveCanvas['uuid']
            ];
        }

        $stmtPubs = $this->pdoCanvases->prepare("
            SELECT id, uuid, user_id, canvas_id, title, description, tags, image_path, width, height, likes_count, views_count, comments_count, privacy, created_at
            FROM " . DB::TBL_PUBLICATIONS . "
            WHERE user_id = ? AND (privacy = 'public' OR ? = 1)
            ORDER BY created_at DESC
            LIMIT 12
        ");
        $stmtPubs->execute([$userId, $isOwner ? 1 : 0]);
        $pubRows = $stmtPubs->fetchAll(PDO::FETCH_ASSOC);

        $likedPubIds = [];
        if ($viewerUserId && !empty($pubRows)) {
            $pubIds = array_column($pubRows, 'id');
            $placeholders = implode(',', array_fill(0, count($pubIds), '?'));
            $stmtLikes = $this->pdoCanvases->prepare("
                SELECT publication_id FROM " . DB::TBL_PUBLICATION_LIKES . "
                WHERE user_id = ? AND publication_id IN ({$placeholders})
            ");
            $stmtLikes->execute(array_merge([$viewerUserId], $pubIds));
            $likedPubIds = array_flip($stmtLikes->fetchAll(PDO::FETCH_COLUMN));
        }

        $identifier = $user['identifier'] ?? strtolower(str_replace(' ', '_', $user['username']));
        $avatarUrl = Utils::getS3PublicUrl($user['profile_picture']);
        $bannerUrl = !empty($user['banner_picture']) ? Utils::getS3PublicUrl($user['banner_picture']) : Utils::getDefaultBannerForUser($userId);
        $subscriptionBg = Utils::formatSubscriptionBg($user['subscription_color'] ?? '');

        $publications = [];
        foreach ($pubRows as $p) {
            $tags = [];
            if (!empty($p['tags'])) {
                $decoded = is_array($p['tags']) ? $p['tags'] : json_decode($p['tags'], true);
                if (is_array($decoded)) $tags = $decoded;
            }

            $publications[] = [
                'id' => (int)$p['id'],
                'uuid' => $p['uuid'],
                'title' => $p['title'],
                'description' => $p['description'] ?? '',
                'tags' => $tags,
                'image_url' => Utils::getS3PublicUrl($p['image_path']),
                'width' => (int)$p['width'],
                'height' => (int)$p['height'],
                'likes_count' => (int)$p['likes_count'],
                'views_count' => (int)$p['views_count'],
                'comments_count' => (int)$p['comments_count'],
                'privacy' => $p['privacy'],
                'created_at' => $p['created_at'],
                'is_liked' => isset($likedPubIds[$p['id']]),
                'is_owner' => $isOwner,
                'author' => [
                    'id' => $userId,
                    'username' => $user['username'],
                    'identifier' => $identifier,
                    'handle' => '@' . $identifier,
                    'avatar_url' => $avatarUrl,
                    'subscription_tier' => (int)($user['subscription_tier'] ?? 0),
                    'subscription_color' => $user['subscription_color'] ?? '#000000',
                    'subscription_bg' => $subscriptionBg
                ]
            ];
        }

        $stmtUserCanvases = $this->pdoCanvases->prepare("
            SELECT id, uuid, name, tags, size, is_online_active, members_count, favorites_count, created_at
            FROM " . DB::TBL_CANVASES . "
            WHERE owner_id = ? AND deleted_at IS NULL AND (privacy = 'public' OR ? = 1)
            ORDER BY created_at DESC
            LIMIT 12
        ");
        $stmtUserCanvases->execute([$userId, $isOwner ? 1 : 0]);
        $canvasRows = $stmtUserCanvases->fetchAll(PDO::FETCH_ASSOC);

        $publicCanvases = [];
        foreach ($canvasRows as $c) {
            $tags = [];
            if (!empty($c['tags'])) {
                $decoded = is_array($c['tags']) ? $c['tags'] : json_decode($c['tags'], true);
                if (is_array($decoded)) $tags = $decoded;
            }

            $publicCanvases[] = [
                'id' => (int)$c['id'],
                'uuid' => $c['uuid'],
                'name' => $c['name'],
                'size' => $c['size'],
                'tags' => $tags,
                'thumbnail_url' => Utils::getS3PublicUrl("thumbnails/canvas_" . $c['uuid'] . ".webp"),
                'is_online_active' => (bool)$c['is_online_active'],
                'members_count' => (int)$c['members_count'],
                'favorites_count' => (int)$c['favorites_count'],
                'created_at' => $c['created_at'],
                'url' => '/design/' . $c['uuid']
            ];
        }

        $followersList = $this->followRepository->getFollowers($userId, $viewerUserId, 1, 12);
        $followingList = $this->followRepository->getFollowing($userId, $viewerUserId, 1, 12);

        return [
            'user' => [
                'id' => $userId,
                'uuid' => $user['uuid'],
                'username' => $user['username'],
                'identifier' => $identifier,
                'handle' => '@' . $identifier,
                'avatar_url' => $avatarUrl,
                'banner_url' => $bannerUrl,
                'bio' => $user['bio'] ?? '',
                'subscription_tier' => (int)($user['subscription_tier'] ?? 0),
                'subscription_color' => $user['subscription_color'] ?? '#000000',
                'subscription_bg' => $subscriptionBg,
                'role_name' => $user['role_name'] ?? 'User',
                'created_at' => $user['created_at']
            ],
            'is_owner' => $isOwner,
            'is_following' => $isFollowing,
            'stats' => [
                'total_publications' => (int)$pubStats['total_publications'],
                'total_likes_received' => (int)$pubStats['total_likes_received'],
                'total_views_received' => (int)$pubStats['total_views_received'],
                'total_canvases' => (int)$canvasStats['total_canvases'],
                'followers_count' => $followersCount,
                'following_count' => $followingCount
            ],
            'live_canvas' => $liveCanvasFormatted,
            'publications' => $publications,
            'public_canvases' => $publicCanvases,
            'followers' => $followersList,
            'following' => $followingList
        ];
    }

    public function getFollowers(string $identifierOrUsername, int $page = 1, int $limit = 20): ?array {
        if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
            session_start();
        }
        $viewerUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
        $cleanHandle = ltrim(trim($identifierOrUsername), '@');

        $user = $this->userRepository->findByIdentifier($cleanHandle);
        if (!$user) {
            $user = $this->userRepository->findByUsername($cleanHandle);
        }
        if (!$user) return null;

        $userId = (int)$user['id'];
        $followers = $this->followRepository->getFollowers($userId, $viewerUserId, $page, $limit);
        $total = $this->followRepository->getFollowersCount($userId);

        return [
            'users' => $followers,
            'total' => $total,
            'page' => $page,
            'per_page' => $limit,
            'has_more' => ($page * $limit) < $total
        ];
    }

    public function getFollowing(string $identifierOrUsername, int $page = 1, int $limit = 20): ?array {
        if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
            session_start();
        }
        $viewerUserId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
        $cleanHandle = ltrim(trim($identifierOrUsername), '@');

        $user = $this->userRepository->findByIdentifier($cleanHandle);
        if (!$user) {
            $user = $this->userRepository->findByUsername($cleanHandle);
        }
        if (!$user) return null;

        $userId = (int)$user['id'];
        $following = $this->followRepository->getFollowing($userId, $viewerUserId, $page, $limit);
        $total = $this->followRepository->getFollowingCount($userId);

        return [
            'users' => $following,
            'total' => $total,
            'page' => $page,
            'per_page' => $limit,
            'has_more' => ($page * $limit) < $total
        ];
    }
}
?>