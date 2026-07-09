<?php
namespace App\Api\Controllers;

use App\Core\System\DatabaseConstants as DB;
use App\Config\DatabaseManager;
use App\Config\RedisManager;
use App\Core\Auth\AuthService;
use Exception;
use PDO;

class ChatController
{
    private $pdo;
    private $auth;
    private $redis;

    public function __construct()
    {
        $dbManager = new DatabaseManager();
        $this->pdo = $dbManager->getConnection(DB::CONN_CANVASES);
        
        $redisManager = new RedisManager();
        $this->redis = $redisManager->getConnection();
        
        $this->auth = new AuthService();
    }

    public function history($request)
    {
        $canvasId = (int)($request['canvas_id'] ?? 0);
        $offset = (int)($request['offset'] ?? 0);
        $limit = 50;

        if ($canvasId <= 0) {
            return ['status' => 'error', 'message' => 'Lienzo inválido', 'code' => 400];
        }

        // Verificar si el canvas permite chat
        $stmt = $this->pdo->prepare("SELECT allow_chat FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas || $canvas['allow_chat'] != 1) {
            return ['status' => 'error', 'message' => 'Chat no habilitado en este lienzo', 'code' => 403];
        }

        try {
            // Se usa subquery para obtener los últimos $limit mensajes ordenados por ID descendentemente
            // Luego en PHP se invierte si es necesario, o el cliente los acomoda.
            $stmt = $this->pdo->prepare("
                SELECT c.id, c.user_id, c.message, c.created_at, u.username, u.avatar 
                FROM canvas_chat_messages c
                JOIN projectrosaura.users u ON c.user_id = u.id
                WHERE c.canvas_id = ?
                ORDER BY c.id DESC
                LIMIT ? OFFSET ?
            ");
            
            // PDO requiere tipos explícitos para LIMIT/OFFSET
            $stmt->bindValue(1, $canvasId, PDO::PARAM_INT);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->bindValue(3, $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'status' => 'success',
                'data' => [
                    'messages' => array_reverse($messages), // Invertimos para que el más viejo quede arriba
                    'has_more' => count($messages) === $limit
                ]
            ];

        } catch (Exception $e) {
            error_log("Error en ChatController->history: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Error al obtener historial', 'code' => 500];
        }
    }

    public function send($request)
    {
        $userId = $this->auth->getUserId();
        if (!$userId) {
            return ['status' => 'error', 'message' => 'No autorizado', 'code' => 401];
        }

        $canvasId = (int)($request['canvas_id'] ?? 0);
        $messageText = trim((string)($request['message'] ?? ''));

        if ($canvasId <= 0 || empty($messageText)) {
            return ['status' => 'error', 'message' => 'Datos inválidos', 'code' => 400];
        }

        if (mb_strlen($messageText) > 255) {
            return ['status' => 'error', 'message' => 'Mensaje muy largo', 'code' => 400];
        }

        $stmt = $this->pdo->prepare("SELECT allow_chat FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas || $canvas['allow_chat'] != 1) {
            return ['status' => 'error', 'message' => 'Chat no habilitado en este lienzo', 'code' => 403];
        }

        try {
            // Guardar en BD
            $stmt = $this->pdo->prepare("INSERT INTO canvas_chat_messages (canvas_id, user_id, message) VALUES (?, ?, ?)");
            $stmt->execute([$canvasId, $userId, $messageText]);
            $msgId = $this->pdo->lastInsertId();

            // Obtener info del usuario para el broadcast
            $userDbManager = new DatabaseManager();
            $userPdo = $userDbManager->getConnection(DB::CONN_MAIN);
            $uStmt = $userPdo->prepare("SELECT username, avatar FROM users WHERE id = ?");
            $uStmt->execute([$userId]);
            $userInfo = $uStmt->fetch(PDO::FETCH_ASSOC);

            $messageData = [
                'id' => $msgId,
                'user_id' => $userId,
                'username' => $userInfo['username'] ?? 'Usuario',
                'avatar' => $userInfo['avatar'] ?? null,
                'message' => htmlspecialchars($messageText, ENT_QUOTES, 'UTF-8'),
                'created_at' => date('Y-m-d H:i:s')
            ];

            // Publicar en Redis para que el WS Server lo transmita
            $eventPayload = [
                'type' => 'chat_message',
                'canvas_id' => $canvasId,
                'data' => $messageData
            ];
            
            $this->redis->publish('admin:canvas_events', json_encode($eventPayload));

            return [
                'status' => 'success',
                'data' => $messageData
            ];

        } catch (Exception $e) {
            error_log("Error en ChatController->send: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Error al enviar mensaje', 'code' => 500];
        }
    }
}
