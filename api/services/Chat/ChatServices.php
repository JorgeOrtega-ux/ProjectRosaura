<?php
namespace App\Api\Services\Chat;

use App\Core\System\DatabaseConstants as DB;
use App\Config\Database\DatabaseManager;
use App\Config\Database\RedisCache;
use App\Config\Database\CassandraManager;
use App\Core\System\CacheConstants;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use PDO;

class ChatServices
{
    private $pdo;
    private $identityPdo;
    private $redis;

    public function __construct(DatabaseManager $dbManager, RedisCache $redisCache)
    {
        $this->pdo = $dbManager->getConnection(DB::CONN_CANVASES);
        $this->identityPdo = $dbManager->getConnection(DB::CONN_IDENTITY);
        $this->redis = $redisCache->getClient();
    }

    public function resolveCanvasIntId($uuid)
    {
        $stmt = $this->pdo->prepare("SELECT id FROM " . DB::TBL_CANVASES . " WHERE uuid = ? LIMIT 1");
        $stmt->execute([$uuid]);
        return (int)($stmt->fetchColumn() ?: 0);
    }

    public function history($userId, $canvasId, $offset)
    {
        $limit = 50;

        if ($canvasId <= 0) {
            return ['success' => false, 'message' => __('err_invalid_canvas'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
}

        $stmt = $this->pdo->prepare("SELECT allow_chat, uuid FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas || $canvas['allow_chat'] != 1) {
            return ['success' => false, 'message' => __('err_chat_disabled'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
}

        $cassandra = new CassandraManager();
        $session = $cassandra->getSession();
        $messages = [];

        if ($session) {
            try {
                $fetchLimit = $offset + $limit;
                $stmt = $session->prepare("SELECT uuid, user_id, message, attachments, created_at, visibility FROM canvas_chat_messages WHERE canvas_id = ? LIMIT ?");
                $rows = $session->execute($stmt, [(int)$canvasId, (int)$fetchLimit])->asRowsResult();
                
                foreach ($rows as $row) {
                    $createdAt = '';
                    if (isset($row['created_at'])) {
                        $dt = null;
                        if ($row['created_at'] instanceof \DateTime) {
                            $dt = $row['created_at'];
                        } else if (is_string($row['created_at'])) {
                            try {
                                $dt = new \DateTime($row['created_at']);
                            } catch (\Exception $ex) {}
                        } else if (is_numeric($row['created_at'])) {
                            $dt = new \DateTime('@' . intval($row['created_at'] / 1000));
                        }
                        
                        if ($dt) {
                            $dt->setTimezone(new \DateTimeZone(date_default_timezone_get()));
                            $createdAt = $dt->format('Y-m-d H:i:s');
                        } else if (is_string($row['created_at'])) {
                            $createdAt = $row['created_at'];
                        }
                    }
                    
                    $messages[] = [
                        'id' => $row['uuid'] ?? '',
                        'uuid' => $row['uuid'] ?? '',
                        'user_id' => (int)($row['user_id'] ?? 0),
                        'message' => $row['message'] ?? '',
                        'attachments' => $row['attachments'] ?? null,
                        'created_at' => $createdAt,
                        'visibility' => $row['visibility'] ?? 'visible'
                    ];
                }
                
                $messages = array_slice($messages, $offset, $limit);
            } catch (\Exception $e) {
                Logger::error("Error querying chat history from Cassandra", ['exception' => $e]);
            }
        } else {
            Logger::error("Cassandra session not available for history query");
        }

        if (!empty($messages)) {
            $userIds = array_values(array_unique(array_column($messages, 'user_id')));
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $userStmt = $this->identityPdo->prepare("
                SELECT u.id, u.uuid, u.username, u.profile_picture, st.color as subscription_color 
                FROM users u 
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level 
                WHERE u.id IN ($placeholders)
            ");
            $userStmt->execute($userIds);
            $usersMap = [];
            while ($row = $userStmt->fetch(PDO::FETCH_ASSOC)) {
                $usersMap[$row['id']] = $row;
            }
            
            foreach ($messages as &$msg) {
                $uid = $msg['user_id'];
                $msg['user_uuid'] = $usersMap[$uid]['uuid'] ?? null;
                $msg['username'] = $usersMap[$uid]['username'] ?? __('default_user');
                $msg['avatar'] = isset($usersMap[$uid]['profile_picture']) ? \App\Core\Helpers\Utils::getS3PublicUrl($usersMap[$uid]['profile_picture']) : null;
                $msg['subscription_color'] = $usersMap[$uid]['subscription_color'] ?? '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}';
                
                // Strip content for non-visible messages
                $vis = $msg['visibility'] ?? 'visible';
                if ($vis !== 'visible') {
                    $msg['message'] = '';
                    $msg['attachments'] = null;
                }
            }
            unset($msg);
        }
        
        if ($offset === 0 && $this->redis) {
            $cacheKey = CacheConstants::PREFIX_CHAT_CANVAS_RECENT . $canvasId;
            $rawRecent = $this->redis->lrange($cacheKey, 0, -1);
            if ($rawRecent) {
                $redisMessages = [];
                foreach ($rawRecent as $item) {
                    $data = json_decode($item, true);
                    if ($data) {
                        $redisMessages[] = [
                            'id' => $data['temp_id'] ?? $data['id'] ?? uniqid(),
                            'user_id' => $data['user_id'],
                            'message' => htmlspecialchars_decode($data['message'] ?? '', ENT_QUOTES),
                            'attachments' => $data['attachments'] ?? null,
                            'created_at' => $data['created_at'],
                            'username' => $data['username'],
                            'avatar' => $data['avatar']
                        ];
                    }
                }
                
                $mysqlSignatures = array_map(function($m) {
                    return $m['user_id'] . '_' . md5($m['message'] ?? '') . '_' . $m['created_at'];
                }, $messages);
                
                $filteredRedisMessages = array_filter($redisMessages, function($m) use ($mysqlSignatures) {
                    $sig = $m['user_id'] . '_' . md5($m['message'] ?? '') . '_' . $m['created_at'];
                    return !in_array($sig, $mysqlSignatures);
                });
                $messages = array_merge($filteredRedisMessages, $messages);
                // Keep only top 50
                $messages = array_slice($messages, 0, $limit);
            }
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

    public function send($userId, $canvasId, $messageText, $files, $clientId = null)
    {
        if ($canvasId <= 0 || (empty($messageText) && empty($files['name'][0]))) {
            return ['success' => false, 'message' => __('err_invalid_data'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
}

        if (mb_strlen($messageText) > 255) {
            return ['success' => false, 'message' => __('err_message_too_long'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
}

        $stmt = $this->pdo->prepare("SELECT allow_chat, uuid FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas || $canvas['allow_chat'] != 1) {
            return ['success' => false, 'message' => __('err_chat_disabled'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
}

        $stmt = $this->pdo->prepare("SELECT id FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ? AND sanction_scope IN ('chat_mute', 'canvas_ban') AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW()))");
        $stmt->execute([$canvasId, $userId]);
        if ($stmt->fetch()) {
            return ['success' => false, 'message' => __('err_chat_restricted'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
        }
        if ($this->redis) {
            $redisKeyBurst = "canvas_chat_burst:{$canvasId}:{$userId}";
            $redisKeyLastMsg = "canvas_chat_last:{$canvasId}:{$userId}";

            $burstCount = $this->redis->incr($redisKeyBurst);
            if ($burstCount === 1) {
                $this->redis->expire($redisKeyBurst, 5);
            }
            if ($burstCount > 3) {
                return ['success' => false, 'message' => __('err_chat_rate_limit'), 'http_code' => \App\Core\System\HttpConstants::TOO_MANY_REQUESTS];
}

            if (!empty($messageText)) {
                $lastMsg = $this->redis->get($redisKeyLastMsg);
                if ($lastMsg === $messageText) {
                    return ['success' => false, 'message' => __('err_chat_duplicate'), 'http_code' => \App\Core\System\HttpConstants::TOO_MANY_REQUESTS];
                }
                $this->redis->setex($redisKeyLastMsg, 3, $messageText);
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
                return ['success' => false, 'message' => __('err_chat_image_size'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
            }
            if (count($files['name']) > $maxImages) {
                return ['success' => false, 'message' => __('err_chat_image_count'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
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

        $msgUuid = \App\Core\Helpers\Utils::generateUUID();
        $msgId = 'pending_' . $msgUuid;

        $uStmt = $this->identityPdo->prepare("
            SELECT u.username, u.uuid, u.profile_picture, st.color as subscription_color 
            FROM " . DB::TBL_USERS . " u 
            LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level 
            WHERE u.id = ?
        ");
        $uStmt->execute([$userId]);
        $userInfo = $uStmt->fetch(PDO::FETCH_ASSOC);

        $defaultUsername = __('default_user');
        
        $censoredMessageText = \App\Core\Helpers\Utils::censorText($messageText);

        $messageData = [
            'id' => $msgId,
            'client_id' => $clientId,
            'user_id' => $userId,
            'user_uuid' => $userInfo['uuid'] ?? '',
            'username' => $userInfo['username'] ?? $defaultUsername,
            'avatar' => isset($userInfo['profile_picture']) ? \App\Core\Helpers\Utils::getS3PublicUrl($userInfo['profile_picture']) : null,
            'subscription_color' => $userInfo['subscription_color'] ?? '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}',
            'message' => htmlspecialchars($censoredMessageText, ENT_QUOTES, 'UTF-8'),
            'attachments' => $safeAttachments,
            'created_at' => date('Y-m-d H:i:s')
        ];

        if ($this->redis) {
            $queuePayload = [
                'canvas_id' => $canvasId,
                'user_id' => $userId,
                'message' => $censoredMessageText,
                'attachments' => $attachmentsJson,
                'file_size' => $totalSize,
                'created_at' => $messageData['created_at'],
                'temp_id' => $msgId,
                'uuid' => $msgUuid,
                'username' => $messageData['username'],
                'avatar' => $messageData['avatar']
            ];
            $this->redis->rpush('canvas_chat_queue', json_encode($queuePayload));

            $cacheKey = CacheConstants::PREFIX_CHAT_CANVAS_RECENT . $canvasId;
            $this->redis->lpush($cacheKey, json_encode($queuePayload));
            $this->redis->ltrim($cacheKey, 0, 49);

            $eventPayload = [
                'type' => 'chat_message',
                'canvas_id' => $canvasId,
                'data' => $messageData
            ];
            
            $this->redis->publish('admin:canvas_events', json_encode($eventPayload));
        } else {
            $cassandra = new CassandraManager();
            $session = $cassandra->getSession();
            if ($session) {
                $stmtInsert = $session->prepare("
                    INSERT INTO canvas_chat_messages (canvas_id, created_at, uuid, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $session->execute($stmtInsert, [
                    (int)$canvasId,
                    new \DateTime($messageData['created_at']),
                    $msgUuid,
                    (int)$userId,
                    $censoredMessageText,
                    $attachmentsJson,
                    (int)$totalSize,
                    'visible',
                    null,
                    null
                ]);
                $messageData['id'] = $msgUuid;
            } else {
                return ['success' => false, 'message' => 'Servicio NoSQL no disponible', 'http_code' => \App\Core\System\HttpConstants::INTERNAL_SERVER_ERROR];
            }
        }

        if ($totalSize > 0) {
            $dbManager = new DatabaseManager();
            $userRepo = new \App\Core\Repositories\UserRepository($dbManager, new \App\Core\Repositories\RoleRepository($dbManager, new \App\Config\Database\RedisCache()));
            $userRepo->updateStorageUsed($userId, $totalSize);
        }

        return [
            'success' => true,
            'data' => $messageData
        ];
}

    public function delete($userId, $canvasId, $messageId)
    {
        $msgUuid = '';
        $msgIntId = 0;
        if (is_numeric($messageId)) {
            $msgIntId = (int)$messageId;
        } else if (!empty($messageId)) {
            $msgUuid = str_replace('pending_', '', $messageId);
        }

        if (($msgIntId <= 0 && empty($msgUuid)) || $canvasId <= 0) {
            return ['success' => false, 'message' => __('err_invalid_data'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
        }

        $cassandra = new CassandraManager();
        $session = $cassandra->getSession();
        if (!$session) {
            return ['success' => false, 'message' => 'Servicio NoSQL no disponible', 'http_code' => 500];
        }

        $searchUuid = !empty($msgUuid) ? $msgUuid : (string)$messageId;
        
        $stmt = $session->prepare("SELECT canvas_id, created_at, user_id, file_size, visibility FROM canvas_chat_messages WHERE uuid = ?");
        $rows = $session->execute($stmt, [$searchUuid])->asRowsResult();
        
        $msg = null;
        foreach ($rows as $row) {
            $msg = $row;
            break;
        }

        if (!$msg) {
            return ['success' => false, 'message' => __('err_message_not_found'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
        }

        if ($msg['user_id'] != $userId) {
            return ['success' => false, 'message' => __('err_cannot_delete_others_message'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
        }

        if (($msg['visibility'] ?? 'visible') === 'deleted') {
            return ['success' => true, 'message' => __('msg_message_deleted')];
        }

        // Soft-delete in Cassandra
        $updateStmt = $session->prepare("UPDATE canvas_chat_messages SET visibility = 'deleted' WHERE canvas_id = ? AND created_at = ? AND uuid = ?");
        $session->execute($updateStmt, [
            (int)$msg['canvas_id'],
            $msg['created_at'],
            $searchUuid
        ]);

        if ($this->redis) {
            $eventPayload = [
                'type' => 'chat_message_deleted',
                'canvas_id' => $canvasId,
                'data' => [
                    'id' => $messageId,
                    'visibility' => 'deleted'
                ]
            ];
            $this->redis->publish('admin:canvas_events', json_encode($eventPayload));
        }

        return ['success' => true, 'message' => __('msg_message_deleted')];
    }

    public function report($userId, $messageId, $reason, $details = '')
    {
        $msgUuid = '';
        $msgIntId = 0;
        if (is_numeric($messageId)) {
            $msgIntId = (int)$messageId;
        } else if (!empty($messageId)) {
            $msgUuid = str_replace('pending_', '', $messageId);
        }

        if (($msgIntId <= 0 && empty($msgUuid)) || empty($reason)) {
            return ['success' => false, 'message' => __('err_invalid_data'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
        }

        $validReasons = array_column(\App\Core\Helpers\Utils::getSanctionReasons()['report_messages'], 'key');
        if (!in_array($reason, $validReasons)) {
            return ['success' => false, 'message' => __('validation.invalid_reason'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
        }

        $cassandra = new CassandraManager();
        $session = $cassandra->getSession();
        if (!$session) {
            return ['success' => false, 'message' => 'Servicio NoSQL no disponible', 'http_code' => 500];
        }

        $searchUuid = !empty($msgUuid) ? $msgUuid : (string)$messageId;
        
        $stmt = $session->prepare("SELECT uuid FROM canvas_chat_messages WHERE uuid = ?");
        $rows = $session->execute($stmt, [$searchUuid])->asRowsResult();
        
        $msg = null;
        foreach ($rows as $row) {
            $msg = $row;
            break;
        }

        if (!$msg) {
            return ['success' => false, 'message' => __('err_message_not_found'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
        }

        $resolvedUuid = $msg['uuid'];

        $stmtInsert = $this->pdo->prepare("INSERT INTO " . DB::TBL_CANVAS_CHAT_REPORTS . " (message_id, reporter_user_id, reason_key, details) VALUES (?, ?, ?, ?)");
        $stmtInsert->execute([$resolvedUuid, $userId, $reason, $details]);

        return ['success' => true, 'message' => __('msg_message_reported')];
    }

    public function getAttachmentAccess($userId, $canvasUuid, $file, $userPermissions)
    {
        if (empty($canvasUuid) || empty($file)) {
            return ['success' => false, 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
}

        $stmt = $this->pdo->prepare("SELECT id, privacy, allow_chat, owner_id FROM " . DB::TBL_CANVASES . " WHERE uuid = ?");
        $stmt->execute([$canvasUuid]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas) {
            return ['success' => false, 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
}

        $canvasId = (int)$canvas['id'];
        $hasAccess = false;
        if ($canvas['privacy'] !== \App\Core\System\CanvasConstants::PRIVACY_PRIVATE) {
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
                return ['success' => false, 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED];
            } else {
                return ['success' => false, 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
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
                \App\Core\Helpers\EnvLoader::get('AWS_ACCESS_KEY_ID', ''),
                \App\Core\Helpers\EnvLoader::get('AWS_SECRET_ACCESS_KEY', '')
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
            Logger::error("Error generating presigned URL for attachment in ChatServices", ['s3_key' => $s3Key, 'exception' => $e]);
            return ['success' => false, 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
        }
    }
}
