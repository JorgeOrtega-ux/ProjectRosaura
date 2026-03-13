<?php
namespace App\Api\Services;

use App\Core\Interfaces\CommentRepositoryInterface;
use App\Core\Interfaces\VideoRepositoryInterface;
use Predis\Client;

class CommentServices {
    private CommentRepositoryInterface $commentRepo;
    private Client $redis;
    private VideoRepositoryInterface $videoRepo;

    // AÑADIDO TIPO 'Client' PARA $redis. Vital para que el Container no explote.
    public function __construct(CommentRepositoryInterface $commentRepo, Client $redis, VideoRepositoryInterface $videoRepo) {
        $this->commentRepo = $commentRepo;
        $this->redis = $redis;
        $this->videoRepo = $videoRepo;
    }

    public function getCommentsForVideo(int $videoId, ?int $currentUserId, int $limit = 20, int $offset = 0): array {
        $cacheKey = "video:{$videoId}:comments:{$offset}:{$limit}";
        
        $cached = $this->redis->get($cacheKey);
        if ($cached) {
            $comments = json_decode($cached, true);
        } else {
            $comments = $this->commentRepo->getCommentsByVideo($videoId, $limit, $offset);
            foreach ($comments as &$comment) {
                $comment['replies'] = $this->commentRepo->getRepliesByComment($comment['id']);
            }
            $this->redis->setex($cacheKey, 3600, json_encode($comments));
        }

        return $this->hydrateReactions($comments, $currentUserId);
    }

    private function hydrateReactions(array $comments, ?int $currentUserId): array {
        if (empty($comments)) return [];

        $pipe = $this->redis->pipeline();
        foreach ($comments as $comment) {
            $pipe->hGetAll("comment:{$comment['id']}:counters");
            if ($currentUserId) {
                $pipe->hGet("comment:{$comment['id']}:user_reaction", (string)$currentUserId);
            }
        }
        
        foreach ($comments as &$comment) {
            foreach ($comment['replies'] as &$reply) {
                $pipe->hGetAll("comment:{$reply['id']}:counters");
                if ($currentUserId) {
                    $pipe->hGet("comment:{$reply['id']}:user_reaction", (string)$currentUserId);
                }
            }
        }
        
        $results = $pipe->execute();
        $resultIndex = 0;
        
        foreach ($comments as &$comment) {
            $counters = $results[$resultIndex++];
            $comment['likes'] = isset($counters['like']) ? (int)$counters['like'] : (int)$comment['likes'];
            $comment['dislikes'] = isset($counters['dislike']) ? (int)$counters['dislike'] : (int)$comment['dislikes'];
            
            if ($currentUserId) {
                $userReaction = $results[$resultIndex++];
                $comment['user_reaction'] = $userReaction ?: null;
            } else {
                $comment['user_reaction'] = null;
            }

            foreach ($comment['replies'] as &$reply) {
                $replyCounters = $results[$resultIndex++];
                $reply['likes'] = isset($replyCounters['like']) ? (int)$replyCounters['like'] : (int)$reply['likes'];
                $reply['dislikes'] = isset($replyCounters['dislike']) ? (int)$replyCounters['dislike'] : (int)$reply['dislikes'];
                
                if ($currentUserId) {
                    $replyUserReaction = $results[$resultIndex++];
                    $reply['user_reaction'] = $replyUserReaction ?: null;
                } else {
                    $reply['user_reaction'] = null;
                }
            }
        }

        return $comments;
    }

    public function addComment(int $videoId, int $userId, string $content, ?int $parentId = null): array {
        
        // Verificamos si los comentarios están permitidos antes de insertarlo en DB
        if (!$this->videoRepo->commentsAllowed($videoId)) {
            throw new \Exception('COMMENTS_DISABLED');
        }
        
        if ($parentId) {
            $commentId = $this->commentRepo->insertReply($videoId, $userId, $parentId, $content);
        } else {
            $commentId = $this->commentRepo->insertComment($videoId, $userId, $content);
        }

        $keys = $this->redis->keys("video:{$videoId}:comments:*");
        if (!empty($keys)) {
            $this->redis->del($keys);
        }

        $newComment = $this->commentRepo->getCommentById($commentId);
        $newComment['replies'] = []; 
        $newComment['likes'] = 0;
        $newComment['dislikes'] = 0;
        $newComment['user_reaction'] = null;

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