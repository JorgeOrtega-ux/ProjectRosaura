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
    private $cassandraManager;

    public function __construct(DatabaseManager $dbManager, RedisCache $redisCache, CassandraManager $cassandraManager)
    {
        $this->pdo = $dbManager->getConnection(DB::CONN_CANVASES);
        $this->identityPdo = $dbManager->getConnection(DB::CONN_IDENTITY);
        $this->redis = $redisCache->getClient();
        $this->cassandraManager = $cassandraManager;
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

        $session = $this->cassandraManager->getSession();
        $messages = [];

        if ($session) {
            try {
                $fetchLimit = $offset + $limit;
                $stmt = $session->prepare("SELECT uuid, user_id, message, attachments, created_at, visibility, reply_to, reply_to_username, reply_to_message FROM canvas_chat_messages WHERE canvas_id = ? LIMIT ?");
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
                        'visibility' => $row['visibility'] ?? 'visible',
                        'reply_to' => $row['reply_to'] ?? null,
                        'reply_to_username' => $row['reply_to_username'] ?? null,
                        'reply_to_message' => $row['reply_to_message'] ?? null
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
                            'avatar' => $data['avatar'],
                            'reply_to' => $data['reply_to'] ?? null,
                            'reply_to_username' => $data['reply_to_username'] ?? null,
                            'reply_to_message' => $data['reply_to_message'] ?? null
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

    public function send($userId, $canvasId, $messageText, $files, $clientId = null, $replyTo = null)
    {
        if ($canvasId <= 0 || (empty($messageText) && empty($files['name'][0]))) {
            return ['success' => false, 'message' => __('err_invalid_data'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST];
        }

        if (strpos($messageText, '/') === 0) {
            $cmdResult = $this->processChatCommand($userId, $canvasId, $messageText);
            if ($cmdResult !== null) {
                return $cmdResult;
            }
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
            $stmtUser = $this->identityPdo->prepare("SELECT subscription_tier FROM users WHERE id = ? LIMIT 1");
            $stmtUser->execute([$userId]);
            $userTier = (int)($stmtUser->fetchColumn() ?: 0);

            $planLimits = \App\Core\System\SubscriptionPlanConstants::getTierLimits($userTier);
            $maxUploadMB = $planLimits['max_upload_mb'] ?? 10;

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

        $replyToUsername = null;
        $replyToMessage = null;
        if (!empty($replyTo)) {
            $session = $this->cassandraManager->getSession();
            if ($session) {
                try {
                    $stmt = $session->prepare("SELECT user_id, message FROM canvas_chat_messages WHERE uuid = ?");
                    $rows = $session->execute($stmt, [$replyTo])->asRowsResult();
                    $parentMsg = null;
                    foreach ($rows as $row) {
                        $parentMsg = $row;
                        break;
                    }
                    if ($parentMsg) {
                        $replyToMessage = $parentMsg['message'] ?? '';
                        $parentId = (int)($parentMsg['user_id'] ?? 0);
                        if ($parentId > 0) {
                            $userStmt = $this->identityPdo->prepare("SELECT username FROM users WHERE id = ? LIMIT 1");
                            $userStmt->execute([$parentId]);
                            $replyToUsername = $userStmt->fetchColumn() ?: __('default_user');
                        }
                    }
                } catch (\Exception $e) {
                    Logger::error("Error querying reply parent message from Cassandra", ['exception' => $e]);
                }
            }
        }

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
            'created_at' => date('Y-m-d H:i:s'),
            'reply_to' => $replyTo,
            'reply_to_username' => $replyToUsername,
            'reply_to_message' => $replyToMessage
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
                'avatar' => $messageData['avatar'],
                'reply_to' => $replyTo,
                'reply_to_username' => $replyToUsername,
                'reply_to_message' => $replyToMessage
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
            $session = $this->cassandraManager->getSession();
            if ($session) {
                $stmtInsert = $session->prepare("
                    INSERT INTO canvas_chat_messages (canvas_id, created_at, uuid, user_id, message, attachments, file_size, visibility, deleted_by, delete_reason, reply_to, reply_to_username, reply_to_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    null,
                    $replyTo,
                    $replyToUsername,
                    $replyToMessage
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

        $session = $this->cassandraManager->getSession();
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

        $session = $this->cassandraManager->getSession();
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

    private function processChatCommand($userId, $canvasId, $messageText) {
        $parts = explode(' ', trim($messageText));
        $command = strtolower($parts[0]);
        
        $allowedCommands = ['/timeout', '/untimeout', '/ban', '/unban', '/canvasban', '/bancanvas', '/canvasunban', '/unbancanvas'];
        if (!in_array($command, $allowedCommands)) {
            if ($this->hasModPermissions($userId, $canvasId)) {
                return [
                    'success' => false, 
                    'message' => "Comando desconocido. Comandos de moderación: /timeout, /untimeout, /ban, /unban, /bancanvas, /unbancanvas",
                    'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST
                ];
            }
            return null; 
        }

        if (!$this->hasModPermissions($userId, $canvasId)) {
            return [
                'success' => false,
                'message' => 'No tienes permisos para ejecutar comandos de moderación en este lienzo.',
                'http_code' => \App\Core\System\HttpConstants::FORBIDDEN
            ];
        }

        if (count($parts) < 2) {
            return [
                'success' => false,
                'message' => "Uso correcto: {$command} [nombre_de_usuario] [duración_segundos (opcional)]",
                'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST
            ];
        }

        $targetUsername = $parts[1];
        
        $stmt = $this->identityPdo->prepare("SELECT id, uuid, username FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
        $stmt->execute([$targetUsername]);
        $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$targetUser) {
            return [
                'success' => false,
                'message' => "Usuario '{$targetUsername}' no encontrado.",
                'http_code' => \App\Core\System\HttpConstants::NOT_FOUND
            ];
        }

        $targetUserId = (int)$targetUser['id'];
        $targetUserUuid = $targetUser['uuid'];
        $realTargetUsername = $targetUser['username'];

        $stmtOwner = $this->pdo->prepare("SELECT owner_id FROM canvases WHERE id = ? LIMIT 1");
        $stmtOwner->execute([$canvasId]);
        $ownerId = (int)$stmtOwner->fetchColumn();

        if ($targetUserId === $ownerId) {
            return [
                'success' => false,
                'message' => 'No puedes aplicar sanciones al dueño del lienzo.',
                'http_code' => \App\Core\System\HttpConstants::FORBIDDEN
            ];
        }

        if ($targetUserId === (int)$userId) {
            return [
                'success' => false,
                'message' => 'No puedes aplicarte sanciones a ti mismo.',
                'http_code' => \App\Core\System\HttpConstants::FORBIDDEN
            ];
        }

        switch ($command) {
            case '/timeout':
                $duration = 600;
                if (isset($parts[2]) && is_numeric($parts[2])) {
                    $duration = (int)$parts[2];
                }
                if ($duration <= 0) {
                    return [
                        'success' => false,
                        'message' => 'La duración del silencio debe ser mayor a 0 segundos.',
                        'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST
                    ];
                }

                $endDate = date('Y-m-d H:i:s', time() + $duration);

                $stmt = $this->pdo->prepare("
                    INSERT INTO canvas_sanctions 
                    (canvas_id, user_id, restricted_by, sanction_scope, suspension_type, suspension_reason, end_date) 
                    VALUES (?, ?, ?, 'chat_mute', 'temporary', 'reason_terms', ?)
                    ON DUPLICATE KEY UPDATE 
                    restricted_by = VALUES(restricted_by),
                    suspension_type = VALUES(suspension_type),
                    suspension_reason = VALUES(suspension_reason),
                    end_date = VALUES(end_date)
                ");
                $stmt->execute([$canvasId, $targetUserId, $userId, $endDate]);

                $this->syncUserRestrictionsToRedis($canvasId, $targetUserId);

                return [
                    'success' => true,
                    'is_command' => true,
                    'message' => "El usuario '{$realTargetUsername}' ha sido silenciado en el chat por {$duration} segundos."
                ];

            case '/untimeout':
                $stmt = $this->pdo->prepare("DELETE FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ? AND sanction_scope = 'chat_mute'");
                $stmt->execute([$canvasId, $targetUserId]);

                $this->syncUserRestrictionsToRedis($canvasId, $targetUserId);

                return [
                    'success' => true,
                    'is_command' => true,
                    'message' => "Se ha levantado el silencio de chat al usuario '{$realTargetUsername}'."
                ];

            case '/ban':
                $stmt = $this->pdo->prepare("
                    INSERT INTO canvas_sanctions 
                    (canvas_id, user_id, restricted_by, sanction_scope, suspension_type, suspension_reason, end_date) 
                    VALUES (?, ?, ?, 'chat_mute', 'permanent', 'reason_terms', NULL)
                    ON DUPLICATE KEY UPDATE 
                    restricted_by = VALUES(restricted_by),
                    suspension_type = VALUES(suspension_type),
                    suspension_reason = VALUES(suspension_reason),
                    end_date = VALUES(end_date)
                ");
                $stmt->execute([$canvasId, $targetUserId, $userId]);

                $this->syncUserRestrictionsToRedis($canvasId, $targetUserId);

                return [
                    'success' => true,
                    'is_command' => true,
                    'message' => "El usuario '{$realTargetUsername}' ha sido silenciado permanentemente del chat."
                ];

            case '/unban':
                $stmt = $this->pdo->prepare("DELETE FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ? AND sanction_scope = 'chat_mute'");
                $stmt->execute([$canvasId, $targetUserId]);

                $this->syncUserRestrictionsToRedis($canvasId, $targetUserId);

                return [
                    'success' => true,
                    'is_command' => true,
                    'message' => "Se ha levantado el baneo de chat al usuario '{$realTargetUsername}'."
                ];

            case '/canvasban':
            case '/bancanvas':
                $stmt = $this->pdo->prepare("DELETE FROM canvas_members WHERE canvas_id = ? AND user_id = ?");
                $stmt->execute([$canvasId, $targetUserId]);

                $stmt = $this->pdo->prepare("
                    INSERT INTO canvas_sanctions 
                    (canvas_id, user_id, restricted_by, sanction_scope, suspension_type, suspension_reason, end_date) 
                    VALUES (?, ?, ?, 'canvas_ban', 'permanent', 'reason_terms', NULL)
                    ON DUPLICATE KEY UPDATE 
                    restricted_by = VALUES(restricted_by),
                    suspension_type = VALUES(suspension_type),
                    suspension_reason = VALUES(suspension_reason),
                    end_date = VALUES(end_date)
                ");
                $stmt->execute([$canvasId, $targetUserId, $userId]);

                $this->syncUserRestrictionsToRedis($canvasId, $targetUserId);

                return [
                    'success' => true,
                    'is_command' => true,
                    'message' => "El usuario '{$realTargetUsername}' ha sido baneado permanentemente del lienzo."
                ];

            case '/canvasunban':
            case '/unbancanvas':
                $stmt = $this->pdo->prepare("DELETE FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ? AND sanction_scope = 'canvas_ban'");
                $stmt->execute([$canvasId, $targetUserId]);

                $this->syncUserRestrictionsToRedis($canvasId, $targetUserId);

                return [
                    'success' => true,
                    'is_command' => true,
                    'message' => "Se ha levantado el baneo del lienzo al usuario '{$realTargetUsername}'."
                ];
        }

        return null;
    }

    private function hasModPermissions($userId, $canvasId): bool {
        $stmt = $this->pdo->prepare("SELECT owner_id FROM canvases WHERE id = ? LIMIT 1");
        $stmt->execute([$canvasId]);
        $ownerId = (int)$stmt->fetchColumn();
        if ($ownerId === (int)$userId) {
            return true;
        }

        $sql = "SELECT 1 
                FROM canvas_user_roles cur
                INNER JOIN canvas_roles r ON cur.role_id = r.id
                INNER JOIN canvas_role_permissions crp ON r.id = crp.role_id
                INNER JOIN canvas_permissions p ON crp.permission_id = p.id
                WHERE cur.canvas_id = ? 
                  AND cur.user_id = ? 
                  AND p.name IN ('manage_sanctions', 'moderate_chat')
                LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$canvasId, $userId]);
        return (bool)$stmt->fetchColumn();
    }

    private function syncUserRestrictionsToRedis($canvasId, $targetUserId) {
        if (!$this->redis) return;

        // Query active sanctions for this user on this canvas
        $stmt = $this->pdo->prepare("
            SELECT sanction_scope, suspension_type, end_date 
            FROM canvas_sanctions 
            WHERE canvas_id = ? AND user_id = ? 
              AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW()))
        ");
        $stmt->execute([$canvasId, $targetUserId]);
        $activeSanctions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $hasCanvasBan = false;
        $hasChatMute = false;
        
        $canvasBanTtl = 0;
        $chatMuteTtl = 0;

        foreach ($activeSanctions as $sanction) {
            $scope = $sanction['sanction_scope'];
            $type = $sanction['suspension_type'];
            $endDate = $sanction['end_date'];
            
            $ttl = 0;
            if ($type === 'temporary' && $endDate) {
                $ttl = strtotime($endDate) - time();
            }

            if ($scope === 'canvas_ban') {
                $hasCanvasBan = true;
                $canvasBanTtl = ($type === 'permanent') ? -1 : max($canvasBanTtl, $ttl);
            } elseif ($scope === 'chat_mute') {
                $hasChatMute = true;
                $chatMuteTtl = ($type === 'permanent') ? -1 : max($chatMuteTtl, $ttl);
            }
        }

        $banKey = sprintf(\App\Core\System\CacheConstants::PREFIX_CANVAS_BANNED, $canvasId, $targetUserId);
        if ($hasCanvasBan) {
            if ($canvasBanTtl == -1) {
                $this->redis->set($banKey, '1');
            } elseif ($canvasBanTtl > 0) {
                $this->redis->setex($banKey, $canvasBanTtl, '1');
            } else {
                $this->redis->del($banKey);
            }
        } else {
            $this->redis->del($banKey);
        }

        $chatKey = sprintf(\App\Core\System\CacheConstants::PREFIX_CHAT_RESTRICTED, $canvasId, $targetUserId);
        if ($hasCanvasBan || $hasChatMute) {
            if ($canvasBanTtl == -1 || $chatMuteTtl == -1) {
                $this->redis->set($chatKey, '1');
            } else {
                $combinedTtl = max($canvasBanTtl, $chatMuteTtl);
                if ($combinedTtl > 0) {
                    $this->redis->setex($chatKey, $combinedTtl, '1');
                } else {
                    $this->redis->del($chatKey);
                }
            }
        } else {
            $this->redis->del($chatKey);
        }
    }

    public function getMediaGallery($userId, $canvasId)
    {
        if ($canvasId <= 0) {
            return ['success' => false, 'message' => __('err_invalid_canvas')];
        }

        $stmt = $this->pdo->prepare("SELECT allow_chat, uuid FROM " . DB::TBL_CANVASES . " WHERE id = ?");
        $stmt->execute([$canvasId]);
        $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$canvas) {
            return ['success' => false, 'message' => __('err_canvas_not_found')];
        }

        $session = $this->cassandraManager->getSession();
        $photos = [];

        if ($session) {
            try {
                $stmt = $session->prepare("SELECT uuid, attachments, visibility FROM canvas_chat_messages WHERE canvas_id = ? LIMIT 1000");
                $rows = $session->execute($stmt, [(int)$canvasId])->asRowsResult();
                
                foreach ($rows as $row) {
                    if (($row['visibility'] ?? 'visible') !== 'visible') {
                        continue;
                    }
                    if (!empty($row['attachments'])) {
                        $decoded = is_string($row['attachments']) ? json_decode($row['attachments'], true) : $row['attachments'];
                        if (is_array($decoded)) {
                            foreach ($decoded as $att) {
                                $photos[] = '/api/index.php?route=chat.attachment&canvas_uuid=' . $canvas['uuid'] . '&file=' . urlencode(basename($att));
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                Logger::error("Error querying chat media gallery from Cassandra", ['exception' => $e]);
            }
        }
        
        return ['success' => true, 'photos' => $photos];
    }
}
