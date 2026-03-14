<?php
namespace App\Api\Services;

use App\Core\Interfaces\RankingRepositoryInterface;
use Predis\Client as RedisClient;

class RankingServices {
    private RankingRepositoryInterface $rankingRepo;
    private RedisClient $redis;

    public function __construct(RankingRepositoryInterface $rankingRepo, RedisClient $redis) {
        $this->rankingRepo = $rankingRepo;
        $this->redis = $redis;
    }

    public function getTopRankings(): array {
        // Obtenemos los rankings precalculados por el Worker de Python desde Redis para carga ultra rápida
        $rankingsJson = $this->redis->get('channel_rankings_top');
        
        if (!$rankingsJson) {
            return []; // Retorna vacío si el worker aún no ha calculado la primera vez
        }

        return json_decode($rankingsJson, true) ?? [];
    }

    public function getChannelRankingHistory(int $userId): array {
        return [
            'current' => $this->rankingRepo->getChannelCurrentRankingInfo($userId),
            'history' => $this->rankingRepo->getChannelHistory($userId, 30)
        ];
    }
}