<?php
// includes/core/Repositories/VideoRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\VideoRepositoryInterface;
use PDO;
use Exception;
use MeiliSearch\Client as MeiliClient;

class VideoRepository implements VideoRepositoryInterface {
    private $db;
    private $meiliClient;

    public function __construct(PDO $db, MeiliClient $meiliClient = null) {
        $this->db = $db;
        $this->meiliClient = $meiliClient;
    }

    /**
     * Helper que reemplaza dinámicamente el título del video según el idioma
     */
    private function applyLocalizedTitle(array $video): array {
        if (!empty($video['localized_titles'])) {
            $titles = json_decode($video['localized_titles'], true);
            $currentLang = $_COOKIE['language'] ?? 'en-US'; // Determinar el idioma actual del usuario
            
            if (is_array($titles) && isset($titles[$currentLang]) && !empty(trim($titles[$currentLang]))) {
                $video['original_title'] = $video['title'];
                $video['title'] = $titles[$currentLang];
            }
        }
        return $video;
    }

    /**
     * Sincroniza el documento del video con Meilisearch.
     */
    private function syncVideoToMeili(int $videoId): void {
        if (!$this->meiliClient) return;
        
        $video = $this->findById($videoId);
        
        if ($video && $video['status'] === 'published' && $video['visibility'] === 'public') {
            $tags = $this->getVideoTags($videoId);
            $tagNames = array_map(function($t) { return $t['name']; }, $tags);
            
            // Para la búsqueda podemos indexar también los títulos localizados para que se encuentre en todos los idiomas
            $doc = [
                'id_video' => $video['id'],
                'id_user' => $video['user_id'],
                'title' => $video['title'],
                'localized_titles' => $video['localized_titles'],
                'description' => $video['description'],
                'tags' => implode(', ', $tagNames),
                'created_at' => $video['created_at'],
                'visibility' => $video['visibility']
            ];
            
            try {
                $this->meiliClient->index('videos')->addDocuments([$doc], 'id_video');
            } catch (Exception $e) {
                error_log("Meilisearch sync error (Video Add): " . $e->getMessage());
            }
        } else {
            // Si el video ya no es público o fue eliminado/suspendido
            try {
                $this->meiliClient->index('videos')->deleteDocument($videoId);
            } catch (Exception $e) {
                error_log("Meilisearch sync error (Video Delete): " . $e->getMessage());
            }
        }
    }

    public function create(int $userId, string $uuid, string $originalFilename, string $tempFilePath): int {
        $stmt = $this->db->prepare("
            INSERT INTO videos (user_id, uuid, original_filename, temp_file_path, status, visibility) 
            VALUES (:user_id, :uuid, :original_filename, :temp_file_path, 'queued', 'public')
        ");
        $stmt->execute([
            ':user_id' => $userId,
            ':uuid' => $uuid,
            ':original_filename' => $originalFilename,
            ':temp_file_path' => $tempFilePath
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function updateStatus(int $videoId, string $status, int $progress = 0): bool {
        $stmt = $this->db->prepare("
            UPDATE videos SET status = :status, processing_progress = :progress WHERE id = :id
        ");
        $success = $stmt->execute([
            ':status' => $status,
            ':progress' => $progress,
            ':id' => $videoId
        ]);
        
        if ($success) {
            $this->syncVideoToMeili($videoId);
        }
        
        return $success;
    }

    public function updateMetadata(int $videoId, array $data): bool {
        $fields = [];
        $params = [':id' => $videoId];
        
        if (isset($data['title'])) {
            $fields[] = "title = :title";
            $params[':title'] = $data['title'];
        }
        if (array_key_exists('localized_titles', $data)) {
            $fields[] = "localized_titles = :localized_titles";
            $params[':localized_titles'] = $data['localized_titles'];
        }
        if (isset($data['thumbnail_path'])) {
            $fields[] = "thumbnail_path = :thumbnail_path";
            $params[':thumbnail_path'] = $data['thumbnail_path'];
        }
        if (isset($data['thumbnail_dominant_color'])) {
            $fields[] = "thumbnail_dominant_color = :thumbnail_dominant_color";
            $params[':thumbnail_dominant_color'] = $data['thumbnail_dominant_color'];
        }
        if (isset($data['duration'])) {
            $fields[] = "duration = :duration";
            $params[':duration'] = (int) $data['duration'];
        }
        if (isset($data['description'])) {
            $fields[] = "description = :description";
            $params[':description'] = $data['description'];
        }
        if (isset($data['visibility'])) {
            $fields[] = "visibility = :visibility";
            $params[':visibility'] = $data['visibility'];
        }
        if (array_key_exists('generated_thumbnails', $data)) {
            $fields[] = "generated_thumbnails = :generated_thumbnails";
            $params[':generated_thumbnails'] = $data['generated_thumbnails'];
        }
        if (array_key_exists('sprite_sheet_path', $data)) {
            $fields[] = "sprite_sheet_path = :sprite_sheet_path";
            $params[':sprite_sheet_path'] = $data['sprite_sheet_path'];
        }
        if (array_key_exists('vtt_path', $data)) {
            $fields[] = "vtt_path = :vtt_path";
            $params[':vtt_path'] = $data['vtt_path'];
        }

        if (empty($fields)) return true;

        $sql = "UPDATE videos SET " . implode(", ", $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($params);
        
        if ($success) {
            $this->syncVideoToMeili($videoId);
        }
        
        return $success;
    }

    public function getActiveUploadsByUserId(int $userId): array {
        try {
            $stmt = $this->db->prepare("
                SELECT v.*, 
                       (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) as comments_count 
                FROM videos v 
                WHERE v.user_id = :user_id 
                AND v.status IN ('queued', 'processing', 'processed', 'failed')
                ORDER BY v.created_at ASC
            ");
            $stmt->execute([':user_id' => $userId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            return array_map([$this, 'applyLocalizedTitle'], $results);
        } catch (\Exception $e) {
            $stmt = $this->db->prepare("
                SELECT * FROM videos 
                WHERE user_id = :user_id 
                AND status IN ('queued', 'processing', 'processed', 'failed')
                ORDER BY created_at ASC
            ");
            $stmt->execute([':user_id' => $userId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            return array_map([$this, 'applyLocalizedTitle'], $results);
        }
    }

    public function getAllByUserId(int $userId): array {
        try {
            $stmt = $this->db->prepare("
                SELECT v.*, 
                       (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) as comments_count 
                FROM videos v 
                WHERE v.user_id = :user_id 
                ORDER BY v.created_at DESC
            ");
            $stmt->execute([':user_id' => $userId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            return array_map([$this, 'applyLocalizedTitle'], $results);
        } catch (\Exception $e) {
            $stmt = $this->db->prepare("
                SELECT * FROM videos 
                WHERE user_id = :user_id 
                ORDER BY created_at DESC
            ");
            $stmt->execute([':user_id' => $userId]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            return array_map([$this, 'applyLocalizedTitle'], $results);
        }
    }

    public function findById(int $id) {
        $stmt = $this->db->prepare("SELECT * FROM videos WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);
        return $video ? $this->applyLocalizedTitle($video) : null;
    }

    public function findByUuid(string $uuid) {
        $stmt = $this->db->prepare("SELECT * FROM videos WHERE uuid = :uuid");
        $stmt->execute([':uuid' => $uuid]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);
        return $video ? $this->applyLocalizedTitle($video) : null;
    }

    public function getPublicVideoDetails(string $uuid): ?array {
        $stmt = $this->db->prepare("
            SELECT v.id, v.uuid, v.title, v.localized_titles, v.description, v.created_at, v.user_id,
                   v.created_at as published_at, v.visibility,
                   v.hls_path, v.temp_file_path, v.sprite_sheet_path, v.vtt_path,
                   v.views, v.likes, v.dislikes, 
                   v.thumbnail_dominant_color as dominant_color, 
                   u.username as channel_name, u.profile_picture as channel_avatar, u.channel_identifier
            FROM videos v
            JOIN users u ON v.user_id = u.id
            WHERE v.uuid = :uuid 
              AND v.status = 'published' 
              AND v.visibility IN ('public', 'unlisted')
        ");
        $stmt->execute([':uuid' => $uuid]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$video) {
            return null;
        }
        
        $video = $this->applyLocalizedTitle($video);

        $allTags = $this->getVideoTags((int)$video['id']);
        
        $video['categories'] = [];
        $video['models'] = [];
        $video['tags'] = [];

        foreach ($allTags as $tag) {
            if ($tag['type'] === 'category') {
                $video['categories'][] = $tag;
            } elseif ($tag['type'] === 'modelo') {
                $video['models'][] = $tag;
            } elseif ($tag['type'] === 'custom') {
                $video['tags'][] = $tag;
            }
        }

        return $video;
    }
    
    public function delete(int $id): bool {
        try {
            $this->db->beginTransaction();
            $stmtTags = $this->db->prepare("DELETE FROM video_tags WHERE video_id = :id");
            $stmtTags->execute([':id' => $id]);
            
            $stmt = $this->db->prepare("DELETE FROM videos WHERE id = :id");
            $stmt->execute([':id' => $id]);
            
            $this->db->commit();
            
            $this->syncVideoToMeili($id);
            
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Error eliminando registro de video de DB: " . $e->getMessage());
            return false;
        }
    }

    public function countProcessingUploads(int $userId): int {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) FROM videos 
            WHERE user_id = :user_id 
            AND status IN ('queued', 'processing')
        ");
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function countDailyUploads(int $userId): int {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) FROM videos 
            WHERE user_id = :user_id 
            AND DATE(created_at) = CURDATE()
        ");
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function getPublicFeed(int $limit = 20, int $offset = 0, string $orientation = 'horizontal'): array {
        $stmt = $this->db->prepare("
            SELECT v.id, v.uuid, v.title, v.localized_titles, v.thumbnail_path, v.thumbnail_dominant_color, 
                   v.duration, v.created_at, v.status, v.visibility, v.hls_path, v.temp_file_path, v.orientation,
                   v.sprite_sheet_path, v.vtt_path, v.views,
                   u.username, u.profile_picture AS avatar_path 
            FROM videos v
            JOIN users u ON v.user_id = u.id
            WHERE v.status = 'published' AND v.visibility = 'public' AND v.orientation = :orientation
            ORDER BY v.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':orientation', $orientation, PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map([$this, 'applyLocalizedTitle'], $results);
    }
    
    public function getChannelVideos(int $userId, string $orientation = 'horizontal'): array {
        $stmt = $this->db->prepare("
            SELECT id, uuid, title, localized_titles, thumbnail_path, thumbnail_dominant_color, 
                   duration, created_at, status, visibility, hls_path, temp_file_path, orientation,
                   sprite_sheet_path, vtt_path, views 
            FROM videos 
            WHERE user_id = :user_id AND status = 'published' AND visibility = 'public' AND orientation = :orientation
            ORDER BY created_at DESC
        ");
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':orientation', $orientation, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        return array_map([$this, 'applyLocalizedTitle'], $results);
    }
    
    public function syncTags(int $videoId, array $tags): bool {
        try {
            $this->db->beginTransaction();
            $stmtDelete = $this->db->prepare("DELETE FROM video_tags WHERE video_id = :video_id");
            $stmtDelete->execute([':video_id' => $videoId]);

            if (!empty($tags)) {
                $sql = "INSERT INTO video_tags (video_id, tag_id, custom_tag_name, custom_tag_type) VALUES ";
                $insertValues = [];
                $params = [];
                
                foreach ($tags as $index => $tag) {
                    $insertValues[] = "(:video_id_{$index}, :tag_id_{$index}, :custom_name_{$index}, :custom_type_{$index})";
                    $params[":video_id_{$index}"] = $videoId;
                    $params[":tag_id_{$index}"] = isset($tag['id']) ? $tag['id'] : null;
                    $params[":custom_name_{$index}"] = isset($tag['name']) ? $tag['name'] : null;
                    $params[":custom_type_{$index}"] = $tag['type'];
                }
                
                $sql .= implode(", ", $insertValues);
                $stmtInsert = $this->db->prepare($sql);
                $stmtInsert->execute($params);
            }

            $this->db->commit();
            
            $this->syncVideoToMeili($videoId);
            
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function getVideoTags(int $videoId): array {
        $stmt = $this->db->prepare("
            SELECT 
                COALESCE(t.id, CONCAT('custom_', vt.id)) as id,
                COALESCE(t.name, vt.custom_tag_name) as name,
                COALESCE(t.type, vt.custom_tag_type) as type,
                t.gender,
                CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END as is_official
            FROM video_tags vt
            LEFT JOIN tags t ON vt.tag_id = t.id
            WHERE vt.video_id = :video_id
            ORDER BY 3 ASC, 2 ASC
        ");
        $stmt->execute([':video_id' => $videoId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getUserInteraction(int $userId, int $videoId): ?string {
        $stmt = $this->db->prepare("SELECT interaction_type FROM video_interactions WHERE user_id = ? AND video_id = ?");
        $stmt->execute([$userId, $videoId]);
        $result = $stmt->fetchColumn();
        return $result ? $result : null;
    }

    public function toggleInteraction(int $userId, int $videoId, string $type): array {
        try {
            $this->db->beginTransaction();

            $currentInteraction = $this->getUserInteraction($userId, $videoId);
            $newState = null;

            if ($currentInteraction === $type) {
                // Si presiona el mismo botón, lo quitamos
                $stmt = $this->db->prepare("DELETE FROM video_interactions WHERE user_id = ? AND video_id = ?");
                $stmt->execute([$userId, $videoId]);
                
                $col = ($type === 'like') ? 'likes' : 'dislikes';
                $this->db->prepare("UPDATE videos SET $col = GREATEST($col - 1, 0) WHERE id = ?")->execute([$videoId]);
                
            } elseif ($currentInteraction !== null) {
                // Si cambia de like a dislike o viceversa
                $stmt = $this->db->prepare("UPDATE video_interactions SET interaction_type = ? WHERE user_id = ? AND video_id = ?");
                $stmt->execute([$type, $userId, $videoId]);

                if ($type === 'like') {
                    $this->db->prepare("UPDATE videos SET likes = likes + 1, dislikes = GREATEST(dislikes - 1, 0) WHERE id = ?")->execute([$videoId]);
                } else {
                    $this->db->prepare("UPDATE videos SET dislikes = dislikes + 1, likes = GREATEST(likes - 1, 0) WHERE id = ?")->execute([$videoId]);
                }
                $newState = $type;

            } else {
                // Si no tenía interacción previa
                $stmt = $this->db->prepare("INSERT INTO video_interactions (user_id, video_id, interaction_type) VALUES (?, ?, ?)");
                $stmt->execute([$userId, $videoId, $type]);

                $col = ($type === 'like') ? 'likes' : 'dislikes';
                $this->db->prepare("UPDATE videos SET $col = $col + 1 WHERE id = ?")->execute([$videoId]);
                $newState = $type;
            }

            // Obtener los conteos actualizados para retornarlos
            $stmtCounts = $this->db->prepare("SELECT likes, dislikes FROM videos WHERE id = ?");
            $stmtCounts->execute([$videoId]);
            $counts = $stmtCounts->fetch(PDO::FETCH_ASSOC);

            $this->db->commit();

            return [
                'current_state' => $newState,
                'likes_count' => (int) $counts['likes'],
                'dislikes_count' => (int) $counts['dislikes']
            ];

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // --- NUEVO: IMPLEMENTACIÓN HEATMAP ---
    public function getRetentionData(int $videoId): ?array {
        $stmt = $this->db->prepare("SELECT retention_data FROM video_retention_metrics WHERE video_id = :video_id");
        $stmt->execute([':video_id' => $videoId]);
        $data = $stmt->fetchColumn();
        return $data ? json_decode($data, true) : null;
    }

    public function updateRetentionData(int $videoId, array $jsonData): bool {
        $jsonString = json_encode($jsonData);
        $stmt = $this->db->prepare("
            INSERT INTO video_retention_metrics (video_id, retention_data) 
            VALUES (:video_id, :data) 
            ON DUPLICATE KEY UPDATE retention_data = VALUES(retention_data)
        ");
        return $stmt->execute([
            ':video_id' => $videoId,
            ':data' => $jsonString
        ]);
    }

    // --- NUEVO: SISTEMA DE VIDEOS GUARDADOS ---
    public function isVideoSaved(int $userId, int $videoId): bool {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM user_saved_videos WHERE user_id = :user_id AND video_id = :video_id");
        $stmt->execute([':user_id' => $userId, ':video_id' => $videoId]);
        return (int) $stmt->fetchColumn() > 0;
    }

    public function toggleSave(int $userId, int $videoId): bool {
        if ($this->isVideoSaved($userId, $videoId)) {
            $stmt = $this->db->prepare("DELETE FROM user_saved_videos WHERE user_id = :user_id AND video_id = :video_id");
            $stmt->execute([':user_id' => $userId, ':video_id' => $videoId]);
            return false; // El estado actual ahora es "No guardado"
        } else {
            $stmt = $this->db->prepare("INSERT INTO user_saved_videos (user_id, video_id) VALUES (:user_id, :video_id)");
            $stmt->execute([':user_id' => $userId, ':video_id' => $videoId]);
            return true; // El estado actual ahora es "Guardado"
        }
    }
}
?>