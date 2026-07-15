<?php
namespace App\Api\Services\Chat;

use App\Core\System\DatabaseConstants as DB;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Core\Helpers\Utils;
use PDO;

class ChatServices
{
    private $pdo;
    private $identityPdo;
    private $redis;

    public function __construct()
    {
        $dbManager = new DatabaseManager();
        $this->pdo = $dbManager->getConnection(DB::CONN_CANVASES);
        $this->identityPdo = $dbManager->getConnection(DB::CONN_IDENTITY);
        
        $redisCache = new RedisCache();
        $this->redis = $redisCache->getClient();
}

    public function history($userId, $canvasId, $offset)
    {
        $limit = 50;

        if ($canvasId <= 0) {
            return ['success' => false, 'message' => __('err_invalid_canvas'), 'http_code' => 400];
}

        $stmt = $this->pdo->prepare("SELECT allow_chat, uuid FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas || $canvas['allow_chat'] != 1) {
            return ['success' => false, 'message' => __('err_chat_disabled'), 'http_code' => 403];
}

        try {
            $this->pdo->exec("ALTER TABLE canvas_chat_messages ADD COLUMN attachments JSON DEFAULT NULL AFTER message;");
        } catch (\Exception $e) {}

        $stmt = $this->pdo->prepare("
            SELECT id, user_id, message, attachments, created_at 
            FROM canvas_chat_messages
            WHERE canvas_id = ?
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        ");
        
        $stmt->bindValue(1, $canvasId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($messages)) {
            $userIds = array_values(array_unique(array_column($messages, 'user_id')));
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $userStmt = $this->identityPdo->prepare("SELECT id, username, profile_picture FROM users WHERE id IN ($placeholders)");
            $userStmt->execute($userIds);
            $usersMap = [];
            while ($row = $userStmt->fetch(PDO::FETCH_ASSOC)) {
                $usersMap[$row['id']] = $row;
            }
            
            foreach ($messages as &$msg) {
                $uid = $msg['user_id'];
                $msg['username'] = $usersMap[$uid]['username'] ?? __('default_user');
                $msg['avatar'] = isset($usersMap[$uid]['profile_picture']) ? \App\Core\Helpers\Utils::getS3PublicUrl($usersMap[$uid]['profile_picture']) : null;
            }
            unset($msg);
        }
        
        if ($offset === 0 && $this->redis) {
            $redisMessages = [];
            $rawQueue = $this->redis->lrange('canvas_chat_queue', 0, -1);
            if ($rawQueue) {
                foreach ($rawQueue as $item) {
                    $data = json_decode($item, true);
                    if ($data && $data['canvas_id'] == $canvasId) {
                        $redisMessages[] = [
                            'id' => $data['temp_id'],
                            'user_id' => $data['user_id'],
                            'message' => htmlspecialchars_decode($data['message'], ENT_QUOTES),
                            'attachments' => $data['attachments'],
                            'created_at' => $data['created_at'],
                            'username' => $data['username'],
                            'avatar' => $data['avatar']
                        ];
                    }
                }
            }
            $redisMessages = array_reverse($redisMessages);
            $messages = array_merge($redisMessages, $messages);
}

        $canvasUuid = $canvas['uuid'];

        foreach ($messages as &$message) {
            if (!empty($message['attachments'])) {
                $decoded = is_string($message['attachments']) ? json_decode($message['attachments'], true) : $message['attachments'];
                if (is_array($decoded)) {
                    $safeAttachments = [];
                    foreach ($decoded as $att) {
                        if (strpos($att, '/public/') === 0) {
                            $safeAttachments[] = $att;
                        } else {
                            $safeAttachments[] = '/api/index.php?route=chat.attachment&canvas_uuid=' . $canvasUuid . '&file=' . urlencode(basename($att));
                        }
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
            'success' => true,
            'data' => [
                'messages' => $messages,
                'has_more' => count($messages) >= $limit
            ]
        ];
}

    public function send($userId, $canvasId, $messageText, $files)
    {
        if ($canvasId <= 0 || (empty($messageText) && empty($files['name'][0]))) {
            return ['success' => false, 'message' => __('err_invalid_data'), 'http_code' => 400];
}

        if (mb_strlen($messageText) > 255) {
            return ['success' => false, 'message' => __('err_message_too_long'), 'http_code' => 400];
}

        $stmt = $this->pdo->prepare("SELECT allow_chat, uuid FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas || $canvas['allow_chat'] != 1) {
            return ['success' => false, 'message' => __('err_chat_disabled'), 'http_code' => 403];
}

        $stmt = $this->pdo->prepare("SELECT id FROM canvas_chat_restrictions WHERE canvas_id = ? AND user_id = ? AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW()))");
        $stmt->execute([$canvasId, $userId]);
        if ($stmt->fetch()) {
            return ['success' => false, 'message' => __('err_chat_restricted'), 'http_code' => 403];
}

        if ($this->redis) {
            $redisKeyBurst = "canvas_chat_burst:{$canvasId}:{$userId}";
            $redisKeyLastMsg = "canvas_chat_last:{$canvasId}:{$userId}";

            $burstCount = $this->redis->incr($redisKeyBurst);
            if ($burstCount === 1) {
                $this->redis->expire($redisKeyBurst, 5);
            }
            if ($burstCount > 3) {
                return ['success' => false, 'message' => __('err_chat_rate_limit'), 'http_code' => 429];
}

            if (!empty($messageText)) {
                $lastMsg = $this->redis->get($redisKeyLastMsg);
                if ($lastMsg === $messageText) {
                    return ['success' => false, 'message' => __('err_chat_duplicate'), 'http_code' => 429];
                }
                $this->redis->setex($redisKeyLastMsg, 10, $messageText);
            }
}

        $attachments = [];
        $canvasUuid = $canvas['uuid'];
        $totalSize = 0;
        
        if ($files && is_array($files['name']) && count($files['name']) > 0 && !empty($files['name'][0])) {
            $maxUploadMB = \App\Core\System\ChatConstants::CHAT_MAX_UPLOAD_MB;
            $maxImages = \App\Core\System\ChatConstants::CHAT_MAX_IMAGES;
            
            $totalSize = array_sum($files['size']);
            if ($totalSize > $maxUploadMB * 1024 * 1024) {
                return ['success' => false, 'message' => __('err_chat_image_size'), 'http_code' => 400];
            }
            if (count($files['name']) > $maxImages) {
                return ['success' => false, 'message' => __('err_chat_image_count'), 'http_code' => 400];
            }
            $uploadDir = 'canvases/' . $canvasUuid . '/chat/';

            for ($i = 0; $i < count($files['name']); $i++) {
                if ($files['error'][$i] === UPLOAD_ERR_OK) {
                    $singleFile = [
                        'name' => $files['name'][$i],
                        'type' => $files['type'][$i],
                        'tmp_name' => $files['tmp_name'][$i],
                        'error' => $files['error'][$i],
                        'size' => $files['size'][$i],
                    ];
                    
                    $uploadResult = Utils::uploadAndSanitizeImage($singleFile, $uploadDir, 25);
                    if ($uploadResult['success'] === true && !empty($uploadResult['file_name'])) {
                        $attachments[] = $uploadResult['file_name'];
                    }
                }
            }
}

        $attachmentsJson = !empty($attachments) ? json_encode($attachments) : null;
        
        $safeAttachments = [];
        foreach ($attachments as $att) {
            if (strpos($att, '/public/') === 0) {
                $safeAttachments[] = $att;
            } else {
                $safeAttachments[] = '/api/index.php?route=chat.attachment&canvas_uuid=' . $canvasUuid . '&file=' . urlencode(basename($att));
            }
}

        $msgId = 'pending_' . uniqid();

        $uStmt = $this->identityPdo->prepare("SELECT username, profile_picture FROM " . DB::TBL_USERS . " WHERE id = ?");
        $uStmt->execute([$userId]);
        $userInfo = $uStmt->fetch(PDO::FETCH_ASSOC);

        $defaultUsername = __('default_user');
        
        $messageData = [
            'id' => $msgId,
            'user_id' => $userId,
            'username' => $userInfo['username'] ?? $defaultUsername,
            'avatar' => isset($userInfo['profile_picture']) ? \App\Core\Helpers\Utils::getS3PublicUrl($userInfo['profile_picture']) : null,
            'message' => htmlspecialchars($messageText, ENT_QUOTES, 'UTF-8'),
            'attachments' => $safeAttachments,
            'created_at' => date('Y-m-d H:i:s')
        ];

        if ($this->redis) {
            $queuePayload = [
                'canvas_id' => $canvasId,
                'user_id' => $userId,
                'message' => $messageText,
                'attachments' => $attachmentsJson,
                'file_size' => $totalSize,
                'created_at' => $messageData['created_at'],
                'temp_id' => $msgId,
                'username' => $messageData['username'],
                'avatar' => $messageData['avatar']
            ];
            $this->redis->rpush('canvas_chat_queue', json_encode($queuePayload));

            $eventPayload = [
                'type' => 'chat_message',
                'canvas_id' => $canvasId,
                'data' => $messageData
            ];
            
            $this->redis->publish('admin:canvas_events', json_encode($eventPayload));
        } else {
            $stmtInsert = $this->pdo->prepare("INSERT INTO canvas_chat_messages (canvas_id, user_id, message, attachments, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?)");
            $stmtInsert->execute([$canvasId, $userId, $messageText, $attachmentsJson, $totalSize, $messageData['created_at']]);
            $messageData['id'] = $this->pdo->lastInsertId();
        }

        if ($totalSize > 0) {
            $dbManager = new DatabaseManager();
            $userRepo = new \App\Core\Repositories\UserRepository($dbManager, new \App\Core\Repositories\RoleRepository($dbManager));
            $userRepo->updateStorageUsed($userId, $totalSize);
        }

        return [
            'success' => true,
            'data' => $messageData
        ];
}

    public function delete($userId, $canvasId, $messageId)
    {
        if ($messageId <= 0 || $canvasId <= 0) {
            return ['success' => false, 'message' => __('err_invalid_data'), 'http_code' => 400];
}

        $stmt = $this->pdo->prepare("SELECT user_id, file_size FROM canvas_chat_messages WHERE id = ? AND canvas_id = ?");
        $stmt->execute([$messageId, $canvasId]);
        $msg = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$msg) {
            return ['success' => false, 'message' => __('err_message_not_found'), 'http_code' => 404];
        }
        
        if ($msg['user_id'] != $userId) {
            return ['success' => false, 'message' => __('err_cannot_delete_others_message'), 'http_code' => 403];
}

        $stmt = $this->pdo->prepare("DELETE FROM canvas_chat_messages WHERE id = ?");
        $stmt->execute([$messageId]);

        if ($msg['file_size'] > 0) {
            $dbManager = new DatabaseManager();
            $userRepo = new \App\Core\Repositories\UserRepository($dbManager, new \App\Core\Repositories\RoleRepository($dbManager));
            $userRepo->updateStorageUsed($userId, -$msg['file_size']);
        }

        if ($this->redis) {
            $eventPayload = [
                'type' => 'chat_message_deleted',
                'canvas_id' => $canvasId,
                'data' => [
                    'id' => $messageId
                ]
            ];
            $this->redis->publish('admin:canvas_events', json_encode($eventPayload));
}

        return ['success' => true, 'message' => __('msg_message_deleted')];
}

    public function report($userId, $messageId, $reason)
    {
        if ($messageId <= 0 || empty($reason)) {
            return ['success' => false, 'message' => __('err_invalid_data'), 'http_code' => 400];
        }
        return ['success' => true, 'message' => __('msg_message_reported')];
}

    public function getAttachmentAccess($userId, $canvasUuid, $file, $userPermissions)
    {
        if (empty($canvasUuid) || empty($file)) {
            return ['success' => false, 'http_code' => 400];
}

        $stmt = $this->pdo->prepare("SELECT id, privacy, allow_chat, owner_id FROM " . DB::TBL_CANVASES . " WHERE uuid = ?");
        $stmt->execute([$canvasUuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas) {
            return ['success' => false, 'http_code' => 404];
}

        $canvasId = (int)$canvas['id'];
        $hasAccess = false;
        
        $isAdmin = is_array($userPermissions) && in_array('access_admin_panel', $userPermissions);

        if ($canvas['privacy'] !== 'private' || $isAdmin) {
            $hasAccess = true;
        } else if ($userId && $canvas['owner_id'] == $userId) {
            $hasAccess = true;
        } else if ($userId) {
            $stmt = $this->pdo->prepare("SELECT id FROM canvas_user_roles WHERE canvas_id = ? AND user_id = ? LIMIT 1");
            $stmt->execute([$canvasId, $userId]);
            if ($stmt->fetch()) {
                $hasAccess = true;
            }
}

        if (!$hasAccess) {
            if (!$userId) {
                return ['success' => false, 'http_code' => 401];
            } else {
                return ['success' => false, 'http_code' => 403];
            }
}

        $s3Key = 'canvases/' . $canvasUuid . '/chat/' . $file;
        $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
        $s3Client = \App\Core\Helpers\Utils::getS3Client();

        try {
            $s3Client->headObject([
                'Bucket' => $bucket,
                'Key' => $s3Key
            ]);
            
            $publicEndpoint = rtrim(\App\Core\Helpers\EnvLoader::get('AWS_PUBLIC_URL', 'http://localhost:9000'), '/');
            $credentials = new \Aws\Credentials\Credentials(
                \App\Core\Helpers\EnvLoader::get('AWS_ACCESS_KEY_ID', 'admin'),
                \App\Core\Helpers\EnvLoader::get('AWS_SECRET_ACCESS_KEY', 'password')
            );
            $s3PublicClient = new \Aws\S3\S3Client([
                'version' => 'latest',
                'region'  => 'us-east-1',
                'endpoint' => $publicEndpoint,
                'use_path_style_endpoint' => true,
                'credentials' => $credentials,
            ]);
            
            $cmd = $s3PublicClient->getCommand('GetObject', [
                'Bucket' => $bucket,
                'Key'    => $s3Key
            ]);
            $request = $s3PublicClient->createPresignedRequest($cmd, '+60 minutes');
            $presignedUrl = (string)$request->getUri();
            
            return [
                'success' => true,
                'presigned_url' => $presignedUrl
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'http_code' => 404];
        }
    }
}
