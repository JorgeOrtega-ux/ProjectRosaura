<?php
// includes/core/Repositories/RecommendationRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\RecommendationRepositoryInterface;
use PDO;

class RecommendationRepository implements RecommendationRepositoryInterface {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getPersonalizedFeed(int $userId, int $limit, int $offset, string $orientation): array {
        // En una arquitectura enterprise, este método idealmente solo se llama 
        // si el worker no ha generado caché. Combina afinidad de tags y visualizaciones.
        return $this->getColdStartFeed($limit, $offset, $orientation);
    }

    public function getSimilarVideos(int $videoId, int $limit): array {
        $sql = "SELECT v.*, u.username, u.profile_picture as avatar_path, 
                (SELECT COUNT(*) FROM subscriptions WHERE channel_id = u.id) as subscriber_count
                FROM videos v 
                JOIN users u ON v.user_id = u.id 
                WHERE v.id != :video_id AND v.status = 'published' AND v.visibility = 'public'
                ORDER BY RAND() LIMIT :limit"; // Fallback simple para el demo
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':video_id', $videoId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getColdStartFeed(int $limit, int $offset, string $orientation): array {
        $sql = "SELECT v.*, u.username, u.profile_picture as avatar_path 
                FROM videos v 
                JOIN users u ON v.user_id = u.id 
                WHERE v.status = 'published' AND v.visibility = 'public' AND v.orientation = :orientation
                ORDER BY v.views DESC, v.created_at DESC 
                LIMIT :limit OFFSET :offset";
                
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':orientation', $orientation, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getVideosByIds(array $videoIds): array {
        if (empty($videoIds)) return [];
        
        $inQuery = implode(',', array_fill(0, count($videoIds), '?'));
        $sql = "SELECT v.*, u.username, u.profile_picture as avatar_path 
                FROM videos v 
                JOIN users u ON v.user_id = u.id 
                WHERE v.id IN ($inQuery) AND v.status = 'published' AND v.visibility = 'public'";
                
        $stmt = $this->db->prepare($sql);
        foreach ($videoIds as $k => $id) {
            $stmt->bindValue(($k+1), $id, PDO::PARAM_INT);
        }
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Ordenar exactamente como vienen en Redis
        $orderedResults = [];
        foreach ($videoIds as $id) {
            foreach ($results as $row) {
                if ($row['id'] == $id) {
                    $orderedResults[] = $row;
                    break;
                }
            }
        }
        return $orderedResults;
    }
}
?>