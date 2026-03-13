<?php
// includes/core/Repositories/HistoryRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\HistoryRepositoryInterface;
use PDO;

class HistoryRepository implements HistoryRepositoryInterface {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getWatchHistory(int $userId, int $limit, int $offset): array {
        $sql = "SELECT v.id, v.uuid, v.title, v.duration, v.thumbnail_path, 
                       v.thumbnail_dominant_color, u.username, u.channel_identifier, 
                       u.profile_picture, u.channel_verified, h.last_watched_at
                FROM user_watch_history h
                JOIN videos v ON h.video_id = v.id
                JOIN users u ON v.user_id = u.id
                WHERE h.user_id = :user_id
                ORDER BY h.last_watched_at DESC
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSearchHistory(int $userId, int $limit, int $offset): array {
        $sql = "SELECT id, search_query, created_at
                FROM user_search_history
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset";
                
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function clearWatchHistory(int $userId): bool {
        $stmt = $this->db->prepare("DELETE FROM user_watch_history WHERE user_id = ?");
        return $stmt->execute([$userId]);
    }

    public function clearSearchHistory(int $userId): bool {
        $stmt = $this->db->prepare("DELETE FROM user_search_history WHERE user_id = ?");
        return $stmt->execute([$userId]);
    }

    public function removeWatchItem(int $userId, int $videoId): bool {
        $stmt = $this->db->prepare("DELETE FROM user_watch_history WHERE user_id = ? AND video_id = ?");
        return $stmt->execute([$userId, $videoId]);
    }

    public function removeSearchItem(int $userId, int $searchId): bool {
        $stmt = $this->db->prepare("DELETE FROM user_search_history WHERE user_id = ? AND id = ?");
        return $stmt->execute([$userId, $searchId]);
    }
}
?>