<?php
namespace App\Core\Interfaces;

interface RankingRepositoryInterface {
    public function getChannelHistory(int $userId, int $limit = 30): array;
    public function getChannelCurrentRankingInfo(int $userId): ?array;
}