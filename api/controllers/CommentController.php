<?php
namespace App\Api\Controllers;

use App\Api\Services\CommentServices;

class CommentController {
    private CommentServices $commentServices;

    public function __construct(CommentServices $commentServices) {
        $this->commentServices = $commentServices;
    }

    public function index() {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $videoId = $_GET['video_id'] ?? $data['video_id'] ?? null;
            $parentId = $_GET['parent_id'] ?? $data['parent_id'] ?? null;
            $offset = $_GET['offset'] ?? $data['offset'] ?? 0;
            $limit = $_GET['limit'] ?? $data['limit'] ?? 10;
            
            // Extracción y validación segura del ordenamiento
            $sortRaw = $_GET['sort'] ?? $data['sort'] ?? 'recent';
            $sort = in_array($sortRaw, ['recent', 'relevant']) ? $sortRaw : 'recent';
            
            $currentUserId = $_SESSION['user_id'] ?? null;

            if (!$videoId && !$parentId) {
                http_response_code(400);
                echo json_encode(['error' => 'video_id o parent_id es requerido']);
                exit; 
            }

            // Si hay un parent_id, cargamos las respuestas de ese comentario
            if ($parentId) {
                $comments = $this->commentServices->getRepliesForComment((int)$parentId, $currentUserId, (int)$limit, (int)$offset);
            } else {
                $comments = $this->commentServices->getCommentsForVideo((int)$videoId, $currentUserId, (int)$limit, (int)$offset, $sort);
            }
            
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'data' => $comments]);
            exit; 

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error 500 en Backend: ' . $e->getMessage()]);
            exit; 
        }
    }

    public function store() {
        try {
            $currentUserId = $_SESSION['user_id'] ?? null;
            if (!$currentUserId) {
                http_response_code(401);
                echo json_encode(['error' => 'No autorizado']);
                exit; 
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $videoId = $data['video_id'] ?? null;
            $content = trim($data['content'] ?? '');
            $parentId = $data['parent_id'] ?? null;

            if (!$videoId || empty($content)) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos inválidos']);
                exit; 
            }

            $content = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');

            $newComment = $this->commentServices->addComment((int)$videoId, $currentUserId, $content, $parentId);

            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'data' => $newComment]);
            exit; 

        } catch (\Exception $e) {
            if ($e->getMessage() === 'COMMENTS_DISABLED') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Los comentarios están desactivados para este video.']);
                exit;
            }
            
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error 500 en Backend: ' . $e->getMessage()]);
            exit; 
        }
    }

    public function react() {
        try {
            $currentUserId = $_SESSION['user_id'] ?? null;
            if (!$currentUserId) {
                http_response_code(401);
                echo json_encode(['error' => 'No autorizado']);
                exit; 
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $commentId = $data['comment_id'] ?? null;
            $type = $data['type'] ?? null; 

            if (!$commentId || !in_array($type, ['like', 'dislike', 'none'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos inválidos']);
                exit; 
            }

            $result = $this->commentServices->reactToComment((int)$commentId, $currentUserId, $type);

            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'data' => $result]);
            exit; 

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error 500 en Backend: ' . $e->getMessage()]);
            exit; 
        }
    }
}