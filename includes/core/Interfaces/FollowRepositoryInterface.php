<?php

namespace App\Core\Interfaces;

interface FollowRepositoryInterface {
    public function toggleFollow(int $followerId, int $followingId): array;
    public function isFollowing(int $followerId, int $followingId): bool;
    public function getFollowersCount(int $userId): int;
    public function getFollowingCount(int $userId): int;
    public function getFollowers(int $userId, ?int $viewerId, int $page = 1, int $limit = 20): array;
    public function getFollowing(int $userId, ?int $viewerId, int $page = 1, int $limit = 20): array;
    public function getFollowingStatusBatch(int $viewerId, array $userIds): array;
}
?>