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
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM playlist_videos pv WHERE pv.playlist_id = p.id) as video_count,
                (
                    SELECT v.thumbnail_path 
                    FROM playlist_videos pv2 
                    JOIN videos v ON pv2.video_id = v.id 
                    WHERE pv2.playlist_id = p.id 
                    ORDER BY pv2.display_order ASC 
                    LIMIT 1
                ) as thumbnail_path
            FROM playlists p 
            WHERE p.user_id = :user_id 
            ORDER BY p.created_at DESC
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

    public function getVideosByPlaylistId(int $playlistId): array {
        $stmt = $this->db->prepare("
            SELECT v.id, v.uuid, v.title, v.thumbnail_path, v.duration, v.visibility, pv.display_order 
            FROM videos v
            INNER JOIN playlist_videos pv ON v.id = pv.video_id
            WHERE pv.playlist_id = :playlist_id
            ORDER BY pv.display_order ASC, pv.created_at ASC
        ");
        $stmt->execute([':playlist_id' => $playlistId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function syncVideos(int $playlistId, array $videoIds): bool {
        try {
            $this->db->beginTransaction();

            $stmtDelete = $this->db->prepare("DELETE FROM playlist_videos WHERE playlist_id = :playlist_id");
            $stmtDelete->execute([':playlist_id' => $playlistId]);

            if (!empty($videoIds)) {
                $stmtInsert = $this->db->prepare("
                    INSERT INTO playlist_videos (playlist_id, video_id, display_order) 
                    VALUES (:playlist_id, :video_id, :display_order)
                ");
                $order = 1;
                foreach ($videoIds as $videoId) {
                    $stmtInsert->execute([
                        ':playlist_id' => $playlistId,
                        ':video_id' => (int)$videoId,
                        ':display_order' => $order
                    ]);
                    $order++;
                }
            }

            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getPublicPlaylistsFeed(int $limit, int $offset): array {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    p.id, p.uuid, p.title, p.created_at, p.user_id,
                    u.username, u.profile_picture as avatar_path,
                    (SELECT COUNT(*) FROM playlist_videos pv WHERE pv.playlist_id = p.id) as video_count,
                    (
                        SELECT v.thumbnail_path 
                        FROM playlist_videos pv2 
                        JOIN videos v ON pv2.video_id = v.id 
                        WHERE pv2.playlist_id = p.id 
                        ORDER BY pv2.display_order ASC 
                        LIMIT 1
                    ) as thumbnail_path,
                    (
                        SELECT v.thumbnail_dominant_color
                        FROM playlist_videos pv2 
                        JOIN videos v ON pv2.video_id = v.id 
                        WHERE pv2.playlist_id = p.id 
                        ORDER BY pv2.display_order ASC 
                        LIMIT 1
                    ) as thumbnail_dominant_color
                FROM playlists p
                INNER JOIN users u ON p.user_id = u.id
                WHERE p.visibility = 'public'
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset
            ");
            
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\PDOException $e) {
            error_log("Error in getPublicPlaylistsFeed: " . $e->getMessage());
            return [];
        }
    }
    
    public function getPlaylistWithVideosByUuid(string $uuid): ?array {
        $stmt = $this->db->prepare("
            SELECT p.id, p.uuid, p.title, p.description, p.visibility, p.created_at, p.user_id,
                   u.username, u.profile_picture as avatar_path,
                   (SELECT COUNT(*) FROM playlist_videos pv WHERE pv.playlist_id = p.id) as video_count,
                   (
                       SELECT v.thumbnail_path 
                       FROM playlist_videos pv2 
                       JOIN videos v ON pv2.video_id = v.id 
                       WHERE pv2.playlist_id = p.id 
                       ORDER BY pv2.display_order ASC 
                       LIMIT 1
                   ) as thumbnail_path,
                   (
                       SELECT v.uuid 
                       FROM playlist_videos pv2 
                       JOIN videos v ON pv2.video_id = v.id 
                       WHERE pv2.playlist_id = p.id 
                       ORDER BY pv2.display_order ASC 
                       LIMIT 1
                   ) as first_video_uuid
            FROM playlists p
            INNER JOIN users u ON p.user_id = u.id
            WHERE p.uuid = :uuid AND p.visibility != 'private'
        ");
        $stmt->execute([':uuid' => $uuid]);
        $playlist = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$playlist) {
            return null;
        }

        $stmtVideos = $this->db->prepare("
            SELECT v.id, v.uuid, v.title, v.description, v.duration, v.thumbnail_path, v.created_at, v.original_filename,
                   u.username,
                   0 as views 
            FROM videos v
            INNER JOIN playlist_videos pv ON v.id = pv.video_id
            INNER JOIN users u ON v.user_id = u.id
            WHERE pv.playlist_id = :playlist_id AND v.visibility != 'private'
            ORDER BY pv.display_order ASC, pv.created_at ASC
        ");
        $stmtVideos->execute([':playlist_id' => $playlist['id']]);
        $videos = $stmtVideos->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'playlist' => $playlist,
            'videos' => $videos
        ];
    }
    
    public function getPlaylistVideosOrdered(string $uuid): array {
        $stmt = $this->db->prepare("SELECT id, title, visibility FROM playlists WHERE uuid = :uuid");
        $stmt->execute([':uuid' => $uuid]);
        $playlist = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$playlist || $playlist['visibility'] === 'private') {
            return []; 
        }

        $stmtVideos = $this->db->prepare("
            SELECT v.uuid, v.title, v.duration, v.thumbnail_path, u.username
            FROM videos v
            INNER JOIN playlist_videos pv ON v.id = pv.video_id
            INNER JOIN users u ON v.user_id = u.id
            WHERE pv.playlist_id = :playlist_id AND v.visibility != 'private'
            ORDER BY pv.display_order ASC
        ");
        $stmtVideos->execute([':playlist_id' => $playlist['id']]);
        $videos = $stmtVideos->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return [
            'title' => $playlist['title'],
            'videos' => $videos
        ];
    }

    // --- NUEVOS MÉTODOS AÑADIDOS ---

    public function getUserPlaylistsWithVideoStatus(int $userId, int $videoId): array {
        $stmt = $this->db->prepare("
            SELECT p.id, p.uuid, p.title, p.visibility,
                   (CASE WHEN pv.id IS NOT NULL THEN 1 ELSE 0 END) as has_video
            FROM playlists p
            LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id AND pv.video_id = :video_id
            WHERE p.user_id = :user_id
            ORDER BY p.created_at DESC
        ");
        $stmt->execute([':user_id' => $userId, ':video_id' => $videoId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function addVideoToPlaylist(int $playlistId, int $videoId): bool {
        // Obtener el último orden para poner el video al final
        $stmtMax = $this->db->prepare("SELECT MAX(display_order) FROM playlist_videos WHERE playlist_id = :pid");
        $stmtMax->execute([':pid' => $playlistId]);
        $max = (int) $stmtMax->fetchColumn();
        $nextOrder = $max + 1;

        $stmt = $this->db->prepare("INSERT IGNORE INTO playlist_videos (playlist_id, video_id, display_order) VALUES (:pid, :vid, :order)");
        return $stmt->execute([':pid' => $playlistId, ':vid' => $videoId, ':order' => $nextOrder]);
    }

    public function removeVideoFromPlaylist(int $playlistId, int $videoId): bool {
        $stmt = $this->db->prepare("DELETE FROM playlist_videos WHERE playlist_id = :pid AND video_id = :vid");
        return $stmt->execute([':pid' => $playlistId, ':vid' => $videoId]);
    }

    public function isVideoInPlaylist(int $playlistId, int $videoId): bool {
        $stmt = $this->db->prepare("SELECT 1 FROM playlist_videos WHERE playlist_id = :pid AND video_id = :vid LIMIT 1");
        $stmt->execute([':pid' => $playlistId, ':vid' => $videoId]);
        return (bool) $stmt->fetchColumn();
    }

    public function getByUuidAndUserId(string $uuid, int $userId): ?array {
        $stmt = $this->db->prepare("SELECT * FROM playlists WHERE uuid = :uuid AND user_id = :user_id");
        $stmt->execute([':uuid' => $uuid, ':user_id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }
}
?>