<?php
namespace Core\Interfaces;

interface CommentRepositoryInterface {
    public function getCommentsByVideo(int $videoId, int $limit, int $offset): array;
    public function getRepliesByComment(int $commentId): array;
    public function insertComment(int $videoId, int $userId, string $content): int;
    public function insertReply(int $videoId, int $userId, int $parentId, string $content): int;
    public function getCommentById(int $commentId): ?array;
    public function deleteComment(int $commentId, int $userId): bool;
}