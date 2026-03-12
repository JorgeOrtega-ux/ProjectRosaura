<?php
namespace App\Api\Controllers;

use App\Api\Services\CommentServices;

class CommentController {
    private CommentServices $commentServices;

    // Se eliminó el " = null" y el fallback. Tu framework se encargará 
    // automáticamente de inyectar el servicio con Redis y el Repositorio.
    public function __construct(CommentServices $commentServices) {
        $this->commentServices = $commentServices;
    }

    public function index() {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            $videoId = $_GET['video_id'] ?? $data['video_id'] ?? null;
            $offset = $_GET['offset'] ?? $data['offset'] ?? 0;
            $limit = $_GET['limit'] ?? $data['limit'] ?? 20;
            
            $currentUserId = $_SESSION['user_id'] ?? null;

            if (!$videoId) {
                http_response_code(400);
                echo json_encode(['error' => 'video_id es requerido']);
                return;
            }

            $comments = $this->commentServices->getCommentsForVideo((int)$videoId, $currentUserId, (int)$limit, (int)$offset);
            
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'data' => $comments]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error 500 en Backend: ' . $e->getMessage()]);
        }
    }

    public function store() {
        try {
            $currentUserId = $_SESSION['user_id'] ?? null;
            if (!$currentUserId) {
                http_response_code(401);
                echo json_encode(['error' => 'No autorizado']);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $videoId = $data['video_id'] ?? null;
            $content = trim($data['content'] ?? '');
            $parentId = $data['parent_id'] ?? null;

            if (!$videoId || empty($content)) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos inválidos']);
                return;
            }

            $content = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');

            $newComment = $this->commentServices->addComment((int)$videoId, $currentUserId, $content, $parentId);

            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'data' => $newComment]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error 500 en Backend: ' . $e->getMessage()]);
        }
    }

    public function react() {
        try {
            $currentUserId = $_SESSION['user_id'] ?? null;
            if (!$currentUserId) {
                http_response_code(401);
                echo json_encode(['error' => 'No autorizado']);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $commentId = $data['comment_id'] ?? null;
            $type = $data['type'] ?? null; 

            if (!$commentId || !in_array($type, ['like', 'dislike', 'none'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos inválidos']);
                return;
            }

            $result = $this->commentServices->reactToComment((int)$commentId, $currentUserId, $type);

            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'data' => $result]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error 500 en Backend: ' . $e->getMessage()]);
        }
    }
}