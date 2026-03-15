<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\CommentRepositoryInterface;
use PDO;

class CommentRepository implements CommentRepositoryInterface {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getCommentsByVideo(int $videoId, int $limit = 10, int $offset = 0, string $sort = 'recent'): array {
        
        $orderBy = "c.created_at DESC";
        
        if ($sort === 'relevant') {
            $orderBy = "c.likes DESC, c.created_at DESC";
        }

        // Subquery agregada para obtener el conteo de respuestas sin traernos la data
        $stmt = $this->db->prepare("
            SELECT c.*, u.username, u.profile_picture, u.channel_identifier,
                   (SELECT COUNT(*) FROM video_comments WHERE parent_id = c.id) as reply_count
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

    // Mantenemos el antiguo por si es usado en otro lado, aunque ya no en el flujo principal.
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

    // Nuevo método: Obtener respuestas con paginación
    public function getRepliesByCommentPaginated(int $commentId, int $limit = 10, int $offset = 0): array {
        $stmt = $this->db->prepare("
            SELECT c.*, u.username, u.profile_picture, u.channel_identifier 
            FROM video_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.parent_id = :parent_id
            ORDER BY c.created_at ASC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':parent_id', $commentId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
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