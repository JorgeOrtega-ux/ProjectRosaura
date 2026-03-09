<?php
// includes/core/Repositories/PlaylistRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\PlaylistRepositoryInterface;
use PDO;

class PlaylistRepository implements PlaylistRepositoryInterface {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function create(int $userId, string $uuid, string $title, ?string $description, string $visibility, string $videoOrder): int {
        $stmt = $this->db->prepare("
            INSERT INTO playlists (user_id, uuid, title, description, visibility, video_order) 
            VALUES (:user_id, :uuid, :title, :description, :visibility, :video_order)
        ");
        $stmt->execute([
            ':user_id' => $userId,
            ':uuid' => $uuid,
            ':title' => $title,
            ':description' => $description,
            ':visibility' => $visibility,
            ':video_order' => $videoOrder
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function getAllByUserId(int $userId): array {
        $stmt = $this->db->prepare("
            SELECT * FROM playlists 
            WHERE user_id = :user_id 
            ORDER BY created_at DESC
        ");
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}
?>