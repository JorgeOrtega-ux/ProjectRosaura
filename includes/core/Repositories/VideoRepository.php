<?php
// includes/core/Repositories/VideoRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\VideoRepositoryInterface;
use PDO;

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
        if (isset($data['description'])) {
            $fields[] = "description = :description";
            $params[':description'] = $data['description'];
        }
        // SOPORTE PARA EL JSON DE MINIATURAS
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
        // Obtenemos los videos que aún no han sido publicados o borrados
        $stmt = $this->db->prepare("
            SELECT * FROM videos 
            WHERE user_id = :user_id 
            AND status IN ('queued', 'processing', 'processed', 'failed')
            ORDER BY created_at ASC
        ");
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    // NUEVO MÉTODO: Obtiene todos los videos sin importar el estado (para la tabla principal)
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

    // Cuenta cuántos videos tiene el usuario en estado de cola o procesando
    public function countProcessingUploads(int $userId): int {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) FROM videos 
            WHERE user_id = :user_id 
            AND status IN ('queued', 'processing')
        ");
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    // Cuenta cuántos videos ha subido el usuario en el día actual
    public function countDailyUploads(int $userId): int {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) FROM videos 
            WHERE user_id = :user_id 
            AND DATE(created_at) = CURDATE()
        ");
        $stmt->execute([':user_id' => $userId]);
        return (int) $stmt->fetchColumn();
    }
}
?>