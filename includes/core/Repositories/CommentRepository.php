<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\CommentRepositoryInterface;
use PDO;

class CommentRepository implements CommentRepositoryInterface {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Aceptamos el parámetro $sort con un valor por defecto para no romper el contrato de la interfaz.
    public function getCommentsByVideo(int $videoId, int $limit = 20, int $offset = 0, string $sort = 'recent'): array {
        
        $orderBy = "c.created_at DESC";
        
        if ($sort === 'relevant') {
            // Se asume que en el modelo actual los likes están en caché (Redis) y en DB como campo de apoyo,
            // o si solo se usan desde Redis, ordenamos por 'likes' en DB si existe la columna, 
            // sino podemos usar una lógica que traiga los más comentados o con más likes asincronamente.
            // Para SQL estándar asumiendo que tienes una columna de likes (o que se sincroniza), el orden sería:
            $orderBy = "c.likes DESC, c.created_at DESC";
        }

        $stmt = $this->db->prepare("
            SELECT c.*, u.username, u.profile_picture, u.channel_identifier 
            FROM video_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.video_id = :video_id AND c.parent_id IS NULL
            ORDER BY {$orderBy}
            LIMIT :limit OFFSET :offset
        ");
        
        $stmt->bindValue(':video_id', $videoId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getRepliesByComment(int $commentId): array {
        $stmt = $this->db->prepare("
            SELECT c.*, u.username, u.profile_picture, u.channel_identifier 
            FROM video_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.parent_id = :parent_id
            ORDER BY c.created_at ASC
        ");
        $stmt->bindValue(':parent_id', $commentId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function insertComment(int $videoId, int $userId, string $content): int {
        $stmt = $this->db->prepare("INSERT INTO video_comments (video_id, user_id, content) VALUES (:video_id, :user_id, :content)");
        $stmt->execute([':video_id' => $videoId, ':user_id' => $userId, ':content' => $content]);
        return (int)$this->db->lastInsertId();
    }

    public function insertReply(int $videoId, int $userId, int $parentId, string $content): int {
        $stmt = $this->db->prepare("INSERT INTO video_comments (video_id, user_id, parent_id, content) VALUES (:video_id, :user_id, :parent_id, :content)");
        $stmt->execute([':video_id' => $videoId, ':user_id' => $userId, ':parent_id' => $parentId, ':content' => $content]);
        return (int)$this->db->lastInsertId();
    }

    public function getCommentById(int $commentId): ?array {
        $stmt = $this->db->prepare("
            SELECT c.*, u.username, u.profile_picture, u.channel_identifier 
            FROM video_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = :id
        ");
        $stmt->execute([':id' => $commentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function deleteComment(int $commentId, int $userId): bool {
        $stmt = $this->db->prepare("DELETE FROM video_comments WHERE id = :id AND user_id = :user_id");
        $stmt->execute([':id' => $commentId, ':user_id' => $userId]);
        return $stmt->rowCount() > 0;
    }
}