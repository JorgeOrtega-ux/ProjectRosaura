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
            return ['status' => 'error', 'message' => __('err_invalid_canvas'), 'code' => 400];
        }

        // Verificar si el canvas permite chat
        $stmt = $this->pdo->prepare("SELECT allow_chat FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas || $canvas['allow_chat'] != 1) {
            return ['status' => 'error', 'message' => __('err_chat_disabled'), 'code' => 403];
        }

        try {
            $this->pdo->exec("ALTER TABLE canvas_chat_messages ADD COLUMN attachments JSON DEFAULT NULL AFTER message;");
        } catch (\Exception $e) {
            // Already exists or other error
        }

        try {
            // Se usa subquery para obtener los últimos $limit mensajes ordenados por ID descendentemente
            // Luego en PHP se invierte si es necesario, o el cliente los acomoda.
            $identityDb = $_ENV['DB_IDENTITY_NAME'] ?? 'db_identity';
            $stmt = $this->pdo->prepare("
                SELECT c.id, c.user_id, c.message, c.attachments, c.created_at, u.username, u.profile_picture as avatar 
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
            
            // Procesar attachments
            foreach ($messages as &$message) {
                if (!empty($message['attachments'])) {
                    $decoded = json_decode($message['attachments'], true);
                    if (is_array($decoded)) {
                        $safeAttachments = [];
                        foreach ($decoded as $att) {
                            if (strpos($att, '/public/') !== 0) {
                                $att = '/public' . $att;
                            }
                            $safeAttachments[] = $att;
                        }
                        $message['attachments'] = $safeAttachments;
                    } else {
                        $message['attachments'] = [];
                    }
                } else {
                    $message['attachments'] = [];
                }
            }
            
            return [
                'status' => 'success',
                'data' => [
                    'messages' => $messages,
                    'has_more' => count($messages) === $limit
                ]
            ];

        } catch (Exception $e) {
            \App\Core\System\Logger::error("Error en ChatController->history: " . $e->getMessage());
            return ['status' => 'error', 'message' => __('err_fetch_history'), 'code' => 500];
        }
    }

    public function send($request)
    {
        $userId = $this->sessionManager->getActiveAccountId();
        if (!$userId) {
            return ['status' => 'error', 'message' => __('err_unauthorized'), 'code' => 401];
        }

        $canvasId = (int)($request['canvas_id'] ?? 0);
        $messageText = trim((string)($request['message'] ?? ''));
        
        $files = $request['_files']['images'] ?? null;

        if ($canvasId <= 0 || (empty($messageText) && empty($files['name'][0]))) {
            return ['status' => 'error', 'message' => __('err_invalid_data'), 'code' => 400];
        }

        if (mb_strlen($messageText) > 255) {
            return ['status' => 'error', 'message' => __('err_message_too_long'), 'code' => 400];
        }

        $stmt = $this->pdo->prepare("SELECT allow_chat FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas || $canvas['allow_chat'] != 1) {
            return ['status' => 'error', 'message' => __('err_chat_disabled'), 'code' => 403];
        }

        // Check if user is restricted
        $stmt = $this->pdo->prepare("SELECT id FROM canvas_chat_restrictions WHERE canvas_id = ? AND user_id = ? AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW()))");
        $stmt->execute([$canvasId, $userId]);
        if ($stmt->fetch()) {
            return ['status' => 'error', 'message' => __('err_chat_restricted'), 'code' => 403];
        }

        // Protecciones Anti-spam / Anti-bot
        $redisKeyBurst = "canvas_chat_burst:{$canvasId}:{$userId}";
        $redisKeyLastMsg = "canvas_chat_last:{$canvasId}:{$userId}";

        // Control de ráfagas (max 3 mensajes en 5 segundos)
        $burstCount = $this->redis->incr($redisKeyBurst);
        if ($burstCount === 1) {
            $this->redis->expire($redisKeyBurst, 5);
        }
        if ($burstCount > 3) {
            return ['status' => 'error', 'message' => __('err_chat_rate_limit'), 'code' => 429];
        }

        // Prevención de spam exacto duplicado (últimos 10 segundos)
        if (!empty($messageText)) {
            $lastMsg = $this->redis->get($redisKeyLastMsg);
            if ($lastMsg === $messageText) {
                return ['status' => 'error', 'message' => __('err_chat_duplicate'), 'code' => 429];
            }
            $this->redis->setex($redisKeyLastMsg, 10, $messageText);
        }

        try {
            $attachments = [];
            
            if ($files && is_array($files['name']) && count($files['name']) > 0 && !empty($files['name'][0])) {
                $totalSize = array_sum($files['size']);
                // max 25 MB total
                if ($totalSize > 25 * 1024 * 1024) {
                    return ['status' => 'error', 'message' => __('err_chat_image_size'), 'code' => 400];
                }
                if (count($files['name']) > 8) {
                    return ['status' => 'error', 'message' => __('err_chat_image_count'), 'code' => 400];
                }
                
                $uploadDir = ROOT_PATH . '/public/storage/canvases/' . $canvasId . '/chat/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                
                for ($i = 0; $i < count($files['name']); $i++) {
                    if ($files['error'][$i] === UPLOAD_ERR_OK) {
                        $singleFile = [
                            'name' => $files['name'][$i],
                            'type' => $files['type'][$i],
                            'tmp_name' => $files['tmp_name'][$i],
                            'error' => $files['error'][$i],
                            'size' => $files['size'][$i],
                        ];
                        
                        $uploadResult = \App\Core\Helpers\Utils::uploadAndSanitizeImage($singleFile, $uploadDir, 25);
                        if ($uploadResult['success'] === true && !empty($uploadResult['file_name'])) {
                            $attachments[] = '/public/storage/canvases/' . $canvasId . '/chat/' . $uploadResult['file_name'];
                        }
                    }
                }
            }

            $attachmentsJson = !empty($attachments) ? json_encode($attachments) : null;

            // Guardar en BD
            $stmt = $this->pdo->prepare("INSERT INTO canvas_chat_messages (canvas_id, user_id, message, attachments) VALUES (?, ?, ?, ?)");
            $stmt->execute([$canvasId, $userId, $messageText, $attachmentsJson]);
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
                'attachments' => $attachments,
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
            \App\Core\System\Logger::error("Error en ChatController->send: " . $e->getMessage());
            return ['status' => 'error', 'message' => __('err_send_message'), 'code' => 500];
        }
    }

    public function delete($request)
    {
        $userId = $this->sessionManager->getActiveAccountId();
        if (!$userId) {
            return ['status' => 'error', 'message' => __('err_unauthorized'), 'code' => 401];
        }

        $messageId = (int)($request['message_id'] ?? 0);
        $canvasId = (int)($request['canvas_id'] ?? 0);

        if ($messageId <= 0 || $canvasId <= 0) {
            return ['status' => 'error', 'message' => __('err_invalid_data'), 'code' => 400];
        }

        try {
            $stmt = $this->pdo->prepare("SELECT user_id FROM canvas_chat_messages WHERE id = ? AND canvas_id = ?");
            $stmt->execute([$messageId, $canvasId]);
            $msg = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$msg) {
                return ['status' => 'error', 'message' => __('err_message_not_found'), 'code' => 404];
            }

            if ($msg['user_id'] != $userId) {
                return ['status' => 'error', 'message' => __('err_cannot_delete_others_message'), 'code' => 403];
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

            return ['status' => 'success', 'message' => __('msg_message_deleted')];
        } catch (Exception $e) {
            \App\Core\System\Logger::error("Error en ChatController->delete: " . $e->getMessage());
            return ['status' => 'error', 'message' => __('err_delete_message'), 'code' => 500];
        }
    }

    public function report($request)
    {
        $userId = $this->sessionManager->getActiveAccountId();
        if (!$userId) {
            return ['status' => 'error', 'message' => __('err_unauthorized'), 'code' => 401];
        }

        $messageId = (int)($request['message_id'] ?? 0);
        $reason = trim((string)($request['reason'] ?? ''));

        if ($messageId <= 0 || empty($reason)) {
            return ['status' => 'error', 'message' => __('err_invalid_data'), 'code' => 400];
        }

        return ['status' => 'success', 'message' => __('msg_message_reported')];
    }
}
