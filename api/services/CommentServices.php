<?php
namespace App\Api\Services;

use App\Core\Interfaces\CommentRepositoryInterface;
use App\Core\Interfaces\VideoRepositoryInterface;
use Predis\Client;

class CommentServices {
    private CommentRepositoryInterface $commentRepo;
    private Client $redis;
    private VideoRepositoryInterface $videoRepo;

    public function __construct(CommentRepositoryInterface $commentRepo, Client $redis, VideoRepositoryInterface $videoRepo) {
        $this->commentRepo = $commentRepo;
        $this->redis = $redis;
        $this->videoRepo = $videoRepo;
    }

    public function getCommentsForVideo(int $videoId, ?int $currentUserId, int $limit = 10, int $offset = 0, string $sort = 'recent'): array {
        $cacheKey = "video:{$videoId}:comments:{$sort}:{$offset}:{$limit}";
        
        $cached = $this->redis->get($cacheKey);
        if ($cached) {
            $comments = json_decode($cached, true);
        } else {
            $comments = $this->commentRepo->getCommentsByVideo($videoId, $limit, $offset, $sort);
            $this->redis->setex($cacheKey, 3600, json_encode($comments));
        }

        return $this->hydrateReactions($comments, $currentUserId);
    }

    public function getRepliesForComment(int $commentId, ?int $currentUserId, int $limit = 10, int $offset = 0): array {
        $cacheKey = "comment:{$commentId}:replies:{$offset}:{$limit}";
        
        $cached = $this->redis->get($cacheKey);
        if ($cached) {
            $replies = json_decode($cached, true);
        } else {
            // Utilizamos el nuevo método del repositorio para respuestas paginadas
            $replies = $this->commentRepo->getRepliesByCommentPaginated($commentId, $limit, $offset);
            $this->redis->setex($cacheKey, 3600, json_encode($replies));
        }

        return $this->hydrateReactions($replies, $currentUserId);
    }

    private function hydrateReactions(array $items, ?int $currentUserId): array {
        if (empty($items)) return [];

        $pipe = $this->redis->pipeline();
        foreach ($items as $item) {
            $pipe->hGetAll("comment:{$item['id']}:counters");
            if ($currentUserId) {
                $pipe->hGet("comment:{$item['id']}:user_reaction", (string)$currentUserId);
            }
        }
        
        $results = $pipe->execute();
        $resultIndex = 0;
        
        foreach ($items as &$item) {
            $counters = $results[$resultIndex++];
            $item['likes'] = isset($counters['like']) ? (int)$counters['like'] : (int)$item['likes'];
            $item['dislikes'] = isset($counters['dislike']) ? (int)$counters['dislike'] : (int)$item['dislikes'];
            
            if ($currentUserId) {
                $userReaction = $results[$resultIndex++];
                $item['user_reaction'] = $userReaction ?: null;
            } else {
                $item['user_reaction'] = null;
            }
        }

        return $items;
    }

    public function addComment(int $videoId, int $userId, string $content, ?int $parentId = null): array {
        
        if (!$this->videoRepo->commentsAllowed($videoId)) {
            throw new \Exception('COMMENTS_DISABLED');
        }
        
        if ($parentId) {
            $commentId = $this->commentRepo->insertReply($videoId, $userId, $parentId, $content);
            // Limpiamos cacheados de las respuestas
            $keysReplies = $this->redis->keys("comment:{$parentId}:replies:*");
            if (!empty($keysReplies)) {
                $this->redis->del($keysReplies);
            }
            // Limpiamos los cacheados principales para que se actualice el contador (reply_count)
            $keysMain = $this->redis->keys("video:{$videoId}:comments:*");
            if (!empty($keysMain)) {
                $this->redis->del($keysMain);
            }
        } else {
            $commentId = $this->commentRepo->insertComment($videoId, $userId, $content);
            $keysMain = $this->redis->keys("video:{$videoId}:comments:*");
            if (!empty($keysMain)) {
                $this->redis->del($keysMain);
            }
        }

        $newComment = $this->commentRepo->getCommentById($commentId);
        $newComment['likes'] = 0;
        $newComment['dislikes'] = 0;
        $newComment['user_reaction'] = null;
        if (!$parentId) {
            $newComment['reply_count'] = 0;
        }

        return $newComment;
    }

    public function reactToComment(int $commentId, int $userId, string $type): array {
        $reactionKey = "comment:{$commentId}:user_reaction";
        $countersKey = "comment:{$commentId}:counters";
        
        $this->redis->sAdd("pending_comment_reactions", [$commentId]);

        $currentReaction = $this->redis->hGet($reactionKey, (string)$userId);

        if ($currentReaction === $type) {
            $this->redis->hDel($reactionKey, [(string)$userId]);
            $this->redis->hIncrBy($countersKey, $type, -1);
            $this->redis->sAdd("comment:{$commentId}:sync_users", [$userId]); 
            return ['status' => 'removed'];
        }

        if ($currentReaction) {
            $this->redis->hIncrBy($countersKey, $currentReaction, -1);
        }

        if ($type !== 'none') {
            $this->redis->hSet($reactionKey, (string)$userId, $type);
            $this->redis->hIncrBy($countersKey, $type, 1);
        }

        $this->redis->sAdd("comment:{$commentId}:sync_users", [$userId]);

        return ['status' => 'added', 'type' => $type];
    }
}