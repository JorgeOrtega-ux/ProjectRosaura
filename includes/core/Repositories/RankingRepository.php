<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\RankingRepositoryInterface;
use PDO;

class RankingRepository implements RankingRepositoryInterface {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getChannelHistory(int $userId, int $limit = 30): array {
        $stmt = $this->db->prepare("
            SELECT rank_position, power_score, recorded_at 
            FROM channel_rankings_history 
            WHERE user_id = :user_id 
            ORDER BY recorded_at DESC 
            LIMIT :limit
        ");
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getChannelCurrentRankingInfo(int $userId): ?array {
        $stmt = $this->db->prepare("
            SELECT current_rank, previous_rank, trend 
            FROM users 
            WHERE id = :user_id AND user_status = 'active'
        ");
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }
}