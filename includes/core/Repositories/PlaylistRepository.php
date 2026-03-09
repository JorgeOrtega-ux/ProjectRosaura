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

    public function getByIdAndUserId(int $id, int $userId): ?array {
        $stmt = $this->db->prepare("SELECT * FROM playlists WHERE id = :id AND user_id = :user_id");
        $stmt->execute([':id' => $id, ':user_id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function update(int $id, string $title, ?string $description, string $visibility, string $videoOrder): bool {
        $stmt = $this->db->prepare("
            UPDATE playlists 
            SET title = :title, description = :description, visibility = :visibility, video_order = :video_order, updated_at = NOW()
            WHERE id = :id
        ");
        return $stmt->execute([
            ':id' => $id,
            ':title' => $title,
            ':description' => $description,
            ':visibility' => $visibility,
            ':video_order' => $videoOrder
        ]);
    }

    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM playlists WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }
}
?>