<?php
// includes/core/Interfaces/RecommendationRepositoryInterface.php

namespace App\Core\Interfaces;

interface RecommendationRepositoryInterface {
    public function getPersonalizedFeed(int $userId, int $limit, int $offset, string $orientation): array;
    public function getSimilarVideos(int $videoId, int $limit): array;
    public function getColdStartFeed(int $limit, int $offset, string $orientation): array;
    public function getVideosByIds(array $videoIds): array;
}
?>