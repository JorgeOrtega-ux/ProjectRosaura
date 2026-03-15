<?php
namespace App\Core\Interfaces;

interface CommentRepositoryInterface {
    public function getCommentsByVideo(int $videoId, int $limit = 10, int $offset = 0, string $sort = 'recent'): array;
    
    public function getRepliesByComment(int $commentId): array;
    
    // El nuevo método que faltaba declarar
    public function getRepliesByCommentPaginated(int $commentId, int $limit = 10, int $offset = 0): array;
    
    public function insertComment(int $videoId, int $userId, string $content): int;
    
    public function insertReply(int $videoId, int $userId, int $parentId, string $content): int;
    
    public function getCommentById(int $commentId): ?array;
    
    public function deleteComment(int $commentId, int $userId): bool;
}