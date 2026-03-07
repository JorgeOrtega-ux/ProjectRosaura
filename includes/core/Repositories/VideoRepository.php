<?php
// includes/core/Repositories/VideoRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\VideoRepositoryInterface;
use PDO;
use Exception;

class VideoRepository implements VideoRepositoryInterface {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function create(int $userId, string $uuid, string $originalFilename, string $tempFilePath): int {
        $stmt = $this->db->prepare("
            INSERT INTO videos (user_id, uuid, original_filename, temp_file_path, status) 
            VALUES (:user_id, :uuid, :original_filename, :temp_file_path, 'queued')
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
        return $stmt->execute([
            ':status' => $status,
            ':progress' => $progress,
            ':id' => $videoId
        ]);
    }

    public function updateMetadata(int $videoId, array $data): bool {
        $fields = [];
        $params = [':id' => $videoId];
        
        if (isset($data['title'])) {
            $fields[] = "title = :title";
            $params[':title'] = $data['title'];
        }
        if (isset($data['thumbnail_path'])) {
            $fields[] = "thumbnail_path = :thumbnail_path";
            $params[':thumbnail_path'] = $data['thumbnail_path'];
        }
        if (isset($data['thumbnail_dominant_color'])) {
            $fields[] = "thumbnail_dominant_color = :thumbnail_dominant_color";
            $params[':thumbnail_dominant_color'] = $data['thumbnail_dominant_color'];
        }
        if (isset($data['description'])) {
            $fields[] = "description = :description";
            $params[':description'] = $data['description'];
        }
        if (array_key_exists('generated_thumbnails', $data)) {
            $fields[] = "generated_thumbnails = :generated_thumbnails";
            $params[':generated_thumbnails'] = $data['generated_thumbnails'];
        }

        if (empty($fields)) return true;

        $sql = "UPDATE videos SET " . implode(", ", $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function getActiveUploadsByUserId(int $userId): array {
        $stmt = $this->db->prepare("
            SELECT * FROM videos 
            WHERE user_id = :user_id 
            AND status IN ('queued', 'processing', 'processed', 'failed')
            ORDER BY created_at ASC
        ");
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getAllByUserId(int $userId): array {
        $stmt = $this->db->prepare("
            SELECT * FROM videos 
            WHERE user_id = :user_id 
            ORDER BY created_at DESC
        ");
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function findById(int $id) {
        $stmt = $this->db->prepare("SELECT * FROM videos WHERE id = :id");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function findByUuid(string $uuid) {
        $stmt = $this->db->prepare("SELECT * FROM videos WHERE uuid = :uuid");
        $stmt->execute([':uuid' => $uuid]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM videos WHERE id = :id");
        return $stmt->execute([':id' => $id]);
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

    // --- MÉTODOS PARA SISTEMA DE TAGS ---

    public function syncTags(int $videoId, array $tagIds): bool {
        try {
            $this->db->beginTransaction();

            $stmtDelete = $this->db->prepare("DELETE FROM video_tags WHERE video_id = :video_id");
            $stmtDelete->execute([':video_id' => $videoId]);

            if (!empty($tagIds)) {
                $sql = "INSERT IGNORE INTO video_tags (video_id, tag_id) VALUES ";
                $insertValues = [];
                $params = [];
                
                foreach ($tagIds as $index => $tagId) {
                    $insertValues[] = "(:video_id_{$index}, :tag_id_{$index})";
                    $params[":video_id_{$index}"] = $videoId;
                    $params[":tag_id_{$index}"] = (int) $tagId;
                }
                
                $sql .= implode(", ", $insertValues);
                $stmtInsert = $this->db->prepare($sql);
                $stmtInsert->execute($params);
            }

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("Error sincronizando etiquetas del video: " . $e->getMessage());
            return false;
        }
    }

    public function getVideoTags(int $videoId): array {
        $stmt = $this->db->prepare("
            SELECT t.* FROM tags t
            INNER JOIN video_tags vt ON t.id = vt.tag_id
            WHERE vt.video_id = :video_id
            ORDER BY t.type ASC, t.name ASC
        ");
        $stmt->execute([':video_id' => $videoId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}
?>