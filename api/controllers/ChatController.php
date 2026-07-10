<?php
namespace App\Api\Controllers;

use App\Core\System\DatabaseConstants as DB;
use App\Config\DatabaseManager;
use App\Config\RedisCache;
use App\Core\Interfaces\SessionManagerInterface;
use Exception;
use PDO;

class ChatController
{
    private $pdo;
    private $sessionManager;
    private $redis;

    public function __construct(SessionManagerInterface $sessionManager)
    {
        $dbManager = new DatabaseManager();
        $this->pdo = $dbManager->getConnection(DB::CONN_CANVASES);
        
        $redisCache = new RedisCache();
        $this->redis = $redisCache->getClient();
        
        $this->sessionManager = $sessionManager;
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
            $identityDb = $_ENV['DB_IDENTITY_NAME'] ?? 'db_identity';
            $stmt = $this->pdo->prepare("
                SELECT c.id, c.user_id, c.message, c.created_at, u.username, u.profile_picture as avatar 
                FROM canvas_chat_messages c
                JOIN {$identityDb}.users u ON c.user_id = u.id
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
                    'messages' => $messages,
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
        $userId = $this->sessionManager->getActiveAccountId();
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

        // Check if user is restricted
        $stmt = $this->pdo->prepare("SELECT id FROM canvas_chat_restrictions WHERE canvas_id = ? AND user_id = ? AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW()))");
        $stmt->execute([$canvasId, $userId]);
        if ($stmt->fetch()) {
            return ['status' => 'error', 'message' => 'Tu acceso al chat ha sido restringido en este lienzo', 'code' => 403];
        }

        try {
            // Guardar en BD
            $stmt = $this->pdo->prepare("INSERT INTO canvas_chat_messages (canvas_id, user_id, message) VALUES (?, ?, ?)");
            $stmt->execute([$canvasId, $userId, $messageText]);
            $msgId = $this->pdo->lastInsertId();

            // Obtener info del usuario para el broadcast
            $userDbManager = new DatabaseManager();
            $userPdo = $userDbManager->getConnection(DB::CONN_IDENTITY);
            $uStmt = $userPdo->prepare("SELECT username, profile_picture FROM " . DB::TBL_USERS . " WHERE id = ?");
            $uStmt->execute([$userId]);
            $userInfo = $uStmt->fetch(PDO::FETCH_ASSOC);

            $messageData = [
                'id' => $msgId,
                'user_id' => $userId,
                'username' => $userInfo['username'] ?? 'Usuario',
                'avatar' => $userInfo['profile_picture'] ?? null,
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

    public function delete($request)
    {
        $userId = $this->sessionManager->getActiveAccountId();
        if (!$userId) {
            return ['status' => 'error', 'message' => 'No autorizado', 'code' => 401];
        }

        $messageId = (int)($request['message_id'] ?? 0);
        $canvasId = (int)($request['canvas_id'] ?? 0);

        if ($messageId <= 0 || $canvasId <= 0) {
            return ['status' => 'error', 'message' => 'Datos inválidos', 'code' => 400];
        }

        try {
            $stmt = $this->pdo->prepare("SELECT user_id FROM canvas_chat_messages WHERE id = ? AND canvas_id = ?");
            $stmt->execute([$messageId, $canvasId]);
            $msg = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$msg) {
                return ['status' => 'error', 'message' => 'Mensaje no encontrado', 'code' => 404];
            }

            if ($msg['user_id'] != $userId) {
                return ['status' => 'error', 'message' => 'No puedes eliminar mensajes de otros', 'code' => 403];
            }

            $stmt = $this->pdo->prepare("DELETE FROM canvas_chat_messages WHERE id = ?");
            $stmt->execute([$messageId]);

            $eventPayload = [
                'type' => 'chat_message_deleted',
                'canvas_id' => $canvasId,
                'data' => [
                    'id' => $messageId
                ]
            ];
            $this->redis->publish('admin:canvas_events', json_encode($eventPayload));

            return ['status' => 'success', 'message' => 'Mensaje eliminado'];
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Error al eliminar', 'code' => 500];
        }
    }

    public function report($request)
    {
        $userId = $this->sessionManager->getActiveAccountId();
        if (!$userId) {
            return ['status' => 'error', 'message' => 'No autorizado', 'code' => 401];
        }

        $messageId = (int)($request['message_id'] ?? 0);
        $reason = trim((string)($request['reason'] ?? ''));

        if ($messageId <= 0 || empty($reason)) {
            return ['status' => 'error', 'message' => 'Datos inválidos', 'code' => 400];
        }

        return ['status' => 'success', 'message' => 'Mensaje reportado con éxito'];
    }
}
