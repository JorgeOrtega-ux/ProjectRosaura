<?php

namespace App\Api\Services\Publications;

use App\Config\Database\DatabaseManager;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\NotificationRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use PDO;
use Exception;

class PublicationsService {
    private DatabaseManager $db;
    private SessionManagerInterface $sessionManager;
    private UserRepositoryInterface $userRepository;
    private ?NotificationRepositoryInterface $notificationRepo;
    private PDO $pdoCanvases;
    private PDO $pdoIdentity;

    public function __construct(
        DatabaseManager $db,
        SessionManagerInterface $sessionManager,
        UserRepositoryInterface $userRepository,
        ?NotificationRepositoryInterface $notificationRepo = null
    ) {
        $this->db = $db;
        $this->sessionManager = $sessionManager;
        $this->userRepository = $userRepository;
        $this->notificationRepo = $notificationRepo;
        $this->pdoCanvases = $this->db->getConnection(DB::CONN_CANVASES);
        $this->pdoIdentity = $this->db->getConnection(DB::CONN_IDENTITY);
    }

    /**
     * Publicar un Pixel Art
     */
    public function publish(array $data): array {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => __('auth.session_expired')];
        }

        $userId = (int)$this->sessionManager->get('user_id');
        $title = Utils::sanitizeText($data['title'] ?? '');
        $description = Utils::sanitizeText($data['description'] ?? '');
        $rawImageData = $data['image_data'] ?? '';
        $canvasId = isset($data['canvas_id']) ? (int)$data['canvas_id'] : null;
        $width = isset($data['width']) ? max(8, min(4096, (int)$data['width'])) : 64;
        $height = isset($data['height']) ? max(8, min(4096, (int)$data['height'])) : 64;
        $privacy = in_array($data['privacy'] ?? 'public', ['public', 'unlisted', 'private'], true) ? $data['privacy'] : 'public';
        $paletteId = Utils::sanitizeText($data['palette_id'] ?? 'default');

        if (empty($title)) {
            return ['success' => false, 'message' => __('publications.title_required')];
        }

        if (strlen($title) > 100) {
            $title = substr($title, 0, 100);
        }

        $tags = [];
        if (!empty($data['tags'])) {
            if (is_array($data['tags'])) {
                $tags = array_slice($data['tags'], 0, 8);
            } elseif (is_string($data['tags'])) {
                $parsed = json_decode($data['tags'], true);
                if (is_array($parsed)) {
                    $tags = array_slice($parsed, 0, 8);
                } else {
                    $tags = array_filter(array_map('trim', explode(',', $data['tags'])));
                }
            }
        }
        $tags = array_values(array_unique(array_map(function($t) {
            return mb_substr(preg_replace('/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ]/u', '', trim($t)), 0, 25);
        }, $tags)));

        if (empty($rawImageData)) {
            return ['success' => false, 'message' => __('publications.image_required')];
        }

        // Decodificar imagen Base64 (PNG data url o raw base64)
        if (preg_match('/^data:image\/(\w+);base64,/', $rawImageData, $type)) {
            $rawImageData = substr($rawImageData, strpos($rawImageData, ',') + 1);
            $type = strtolower($type[1]);
            if ($type !== 'png' && $type !== 'jpeg' && $type !== 'webp') {
                return ['success' => false, 'message' => __('upload.invalid_format')];
            }
        }
        $decodedImage = base64_decode($rawImageData);
        if ($decodedImage === false || strlen($decodedImage) < 10) {
            return ['success' => false, 'message' => __('publications.invalid_image_data')];
        }

        $uuid = Utils::generateUuid();
        $pubRelDir = 'publications';
        $rootPath = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 3);
        $fullPubDir = $rootPath . '/storage/public/' . $pubRelDir;

        if (!file_exists($fullPubDir)) {
            @mkdir($fullPubDir, 0755, true);
        }

        $fileName = $uuid . '.png';
        $fullPath = $fullPubDir . '/' . $fileName;
        $relDbPath = $pubRelDir . '/' . $fileName;

        // Guardar copia en disco local
        if (file_put_contents($fullPath, $decodedImage) === false) {
            Logger::error("Failed to save publication image file", ['path' => $fullPath]);
            return ['success' => false, 'message' => __('publications.save_error')];
        }

        // Subir a MinIO / Amazon S3
        $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
        $s3Key = $pubRelDir . '/' . $fileName;
        try {
            $s3Client = Utils::getS3Client();
            $s3Client->putObject([
                'Bucket' => $bucket,
                'Key'    => $s3Key,
                'Body'   => $decodedImage,
                'ContentType' => 'image/png'
            ]);
        } catch (\Throwable $e) {
            Logger::error("Failed to upload publication image to S3", ['exception' => $e->getMessage(), 'uuid' => $uuid]);
            @unlink($fullPath);
            return ['success' => false, 'message' => __('publications.save_error')];
        }

        try {
            $stmt = $this->pdoCanvases->prepare("
                INSERT INTO " . DB::TBL_PUBLICATIONS . "
                (uuid, user_id, canvas_id, title, description, tags, image_path, width, height, palette_id, privacy, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $uuid,
                $userId,
                $canvasId,
                $title,
                $description,
                json_encode($tags),
                $relDbPath,
                $width,
                $height,
                $paletteId,
                $privacy
            ]);

            $pubId = (int)$this->pdoCanvases->lastInsertId();

            return [
                'success' => true,
                'message' => __('publications.published_success'),
                'uuid' => $uuid,
                'publication_id' => $pubId,
                'url' => '/publication/' . $uuid
            ];
        } catch (\Throwable $e) {
            @unlink($fullPath);
            try {
                $s3Client = Utils::getS3Client();
                $s3Client->deleteObject(['Bucket' => $bucket, 'Key' => $s3Key]);
            } catch (\Throwable $s3Ex) {}
            Logger::error("Database error inserting publication", ['exception' => $e, 'user_id' => $userId]);
            return ['success' => false, 'message' => __('error.database')];
        }
    }

    /**
     * Obtener feed de publicaciones
     */
    public function getFeed(array $params = []): array {
        $limit = isset($params['limit']) ? max(1, min(50, (int)$params['limit'])) : 20;
        $offset = isset($params['offset']) ? max(0, (int)$params['offset']) : 0;
        $tag = isset($params['tag']) ? trim($params['tag']) : null;
        $sort = $params['sort'] ?? 'recent'; // 'recent', 'popular', 'top'
        $viewerUserId = $this->sessionManager->has('user_id') ? (int)$this->sessionManager->get('user_id') : null;

        $where = ["p.privacy = 'public'"];
        $bindings = [];

        if (!empty($tag) && $tag !== 'all' && $tag !== 'todos') {
            $where[] = "JSON_CONTAINS(p.tags, ?)";
            $bindings[] = json_encode($tag);
        }

        $orderBy = 'p.created_at DESC';
        if ($sort === 'popular' || $sort === 'top') {
            $orderBy = 'p.likes_count DESC, p.created_at DESC';
        }

        $whereSql = implode(' AND ', $where);

        try {
            $sql = "
                SELECT 
                    p.id, p.uuid, p.user_id, p.canvas_id, p.title, p.description, p.tags, 
                    p.image_path, p.width, p.height, p.likes_count, p.views_count, p.comments_count, 
                    p.privacy, p.created_at
                FROM " . DB::TBL_PUBLICATIONS . " p
                WHERE {$whereSql}
                ORDER BY {$orderBy}
                LIMIT {$limit} OFFSET {$offset}
            ";

            $stmt = $this->pdoCanvases->prepare($sql);
            $stmt->execute($bindings);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $posts = $this->hydrateAuthorAndLikeData($rows, $viewerUserId);

            return [
                'success' => true,
                'data' => $posts,
                'has_more' => count($rows) === $limit,
                'count' => count($posts)
            ];
        } catch (\Throwable $e) {
            Logger::error("Error fetching publications feed", ['exception' => $e]);
            return ['success' => false, 'message' => __('error.database'), 'data' => []];
        }
    }

    /**
     * Obtener publicaciones de un usuario específico
     */
    public function getUserPublications(string $identifierOrUsername, array $params = []): array {
        $viewerUserId = $this->sessionManager->has('user_id') ? (int)$this->sessionManager->get('user_id') : null;
        
        $cleanHandle = ltrim($identifierOrUsername, '@');
        $user = $this->userRepository->findByIdentifier($cleanHandle);
        if (!$user) {
            $user = $this->userRepository->findByUsername($cleanHandle);
        }

        if (!$user) {
            return ['success' => false, 'message' => __('error.user_not_found'), 'data' => []];
        }

        $targetUserId = (int)$user['id'];
        $isOwner = $viewerUserId === $targetUserId;

        $limit = isset($params['limit']) ? max(1, min(50, (int)$params['limit'])) : 20;
        $offset = isset($params['offset']) ? max(0, (int)$params['offset']) : 0;

        $where = ["p.user_id = ?"];
        $bindings = [$targetUserId];

        if (!$isOwner) {
            $where[] = "p.privacy = 'public'";
        }

        $whereSql = implode(' AND ', $where);

        try {
            $stmt = $this->pdoCanvases->prepare("
                SELECT 
                    p.id, p.uuid, p.user_id, p.canvas_id, p.title, p.description, p.tags, 
                    p.image_path, p.width, p.height, p.likes_count, p.views_count, p.comments_count, 
                    p.privacy, p.created_at
                FROM " . DB::TBL_PUBLICATIONS . " p
                WHERE {$whereSql}
                ORDER BY p.created_at DESC
                LIMIT {$limit} OFFSET {$offset}
            ");
            $stmt->execute($bindings);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $posts = $this->hydrateAuthorAndLikeData($rows, $viewerUserId, [$targetUserId => $user]);

            return [
                'success' => true,
                'data' => $posts,
                'has_more' => count($rows) === $limit,
                'target_user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'identifier' => $user['identifier'] ?? strtolower(str_replace(' ', '_', $user['username'])),
                    'profile_picture' => Utils::getS3PublicUrl($user['profile_picture']),
                    'banner_picture' => !empty($user['banner_picture']) ? Utils::getS3PublicUrl($user['banner_picture']) : null,
                    'bio' => $user['bio'] ?? ''
                ]
            ];
        } catch (\Throwable $e) {
            Logger::error("Error fetching user publications", ['exception' => $e, 'identifier' => $identifierOrUsername]);
            return ['success' => false, 'message' => __('error.database'), 'data' => []];
        }
    }

    /**
     * Obtener detalle completo de una publicación
     */
    public function getDetail(string $uuidOrId): array {
        $viewerUserId = $this->sessionManager->has('user_id') ? (int)$this->sessionManager->get('user_id') : null;

        try {
            $column = is_numeric($uuidOrId) ? 'p.id' : 'p.uuid';
            $stmt = $this->pdoCanvases->prepare("
                SELECT 
                    p.id, p.uuid, p.user_id, p.canvas_id, p.title, p.description, p.tags, 
                    p.image_path, p.width, p.height, p.palette_id, p.likes_count, p.views_count, p.comments_count, 
                    p.privacy, p.created_at, p.updated_at
                FROM " . DB::TBL_PUBLICATIONS . " p
                WHERE {$column} = ?
                LIMIT 1
            ");
            $stmt->execute([$uuidOrId]);
            $pub = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$pub) {
                return ['success' => false, 'message' => __('publications.not_found')];
            }

            // Incrementar vistas
            $this->pdoCanvases->prepare("UPDATE " . DB::TBL_PUBLICATIONS . " SET views_count = views_count + 1 WHERE id = ?")->execute([$pub['id']]);
            $pub['views_count']++;

            $author = $this->userRepository->findById((int)$pub['user_id']);
            if (!$author) {
                return ['success' => false, 'message' => __('publications.author_not_found')];
            }

            // Verificar si el visor le dio Me Gusta
            $isLiked = false;
            if ($viewerUserId) {
                $stmtLike = $this->pdoCanvases->prepare("SELECT 1 FROM " . DB::TBL_PUBLICATION_LIKES . " WHERE publication_id = ? AND user_id = ? LIMIT 1");
                $stmtLike->execute([$pub['id'], $viewerUserId]);
                $isLiked = (bool)$stmtLike->fetchColumn();
            }

            // Formatear tags
            $tags = [];
            if (!empty($pub['tags'])) {
                $decoded = is_array($pub['tags']) ? $pub['tags'] : json_decode($pub['tags'], true);
                if (is_array($decoded)) $tags = $decoded;
            }

            $authorIdentifier = $author['identifier'] ?? strtolower(str_replace(' ', '_', $author['username']));

            $formatted = [
                'id' => (int)$pub['id'],
                'uuid' => $pub['uuid'],
                'title' => $pub['title'],
                'description' => $pub['description'] ?? '',
                'tags' => $tags,
                'image_url' => Utils::getS3PublicUrl($pub['image_path']),
                'width' => (int)$pub['width'],
                'height' => (int)$pub['height'],
                'palette_id' => $pub['palette_id'] ?? 'default',
                'likes_count' => (int)$pub['likes_count'],
                'views_count' => (int)$pub['views_count'],
                'comments_count' => (int)$pub['comments_count'],
                'privacy' => $pub['privacy'],
                'created_at' => $pub['created_at'],
                'is_liked' => $isLiked,
                'is_owner' => $viewerUserId === (int)$pub['user_id'],
                'author' => [
                    'id' => (int)$author['id'],
                    'uuid' => $author['uuid'],
                    'username' => $author['username'],
                    'identifier' => $authorIdentifier,
                    'handle' => '@' . $authorIdentifier,
                    'avatar_url' => Utils::getS3PublicUrl($author['profile_picture']),
                    'banner_url' => !empty($author['banner_picture']) ? Utils::getS3PublicUrl($author['banner_picture']) : null,
                    'bio' => $author['bio'] ?? '',
                    'subscription_tier' => (int)($author['subscription_tier'] ?? 0),
                    'subscription_color' => $author['subscription_color'] ?? '#000000',
                    'role_name' => $author['role_name'] ?? 'User'
                ]
            ];

            return ['success' => true, 'data' => $formatted];
        } catch (\Throwable $e) {
            Logger::error("Error fetching publication detail", ['exception' => $e, 'id' => $uuidOrId]);
            return ['success' => false, 'message' => __('error.database')];
        }
    }

    /**
     * Alternar Me Gusta (Like / Unlike)
     */
    public function toggleLike(string $pubUuid): array {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => __('auth.session_expired')];
        }

        $userId = (int)$this->sessionManager->get('user_id');

        try {
            $stmt = $this->pdoCanvases->prepare("SELECT id, user_id, uuid, title, likes_count FROM " . DB::TBL_PUBLICATIONS . " WHERE uuid = ? OR id = ? LIMIT 1");
            $stmt->execute([$pubUuid, $pubUuid]);
            $pub = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$pub) {
                return ['success' => false, 'message' => __('publications.not_found')];
            }

            $pubId = (int)$pub['id'];

            $stmtCheck = $this->pdoCanvases->prepare("SELECT id FROM " . DB::TBL_PUBLICATION_LIKES . " WHERE publication_id = ? AND user_id = ? LIMIT 1");
            $stmtCheck->execute([$pubId, $userId]);
            $like = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if ($like) {
                $this->pdoCanvases->prepare("DELETE FROM " . DB::TBL_PUBLICATION_LIKES . " WHERE id = ?")->execute([$like['id']]);
                $this->pdoCanvases->prepare("UPDATE " . DB::TBL_PUBLICATIONS . " SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?")->execute([$pubId]);
                $liked = false;
                $newCount = max(0, (int)$pub['likes_count'] - 1);
            } else {
                $this->pdoCanvases->prepare("INSERT INTO " . DB::TBL_PUBLICATION_LIKES . " (publication_id, user_id, created_at) VALUES (?, ?, NOW())")->execute([$pubId, $userId]);
                $this->pdoCanvases->prepare("UPDATE " . DB::TBL_PUBLICATIONS . " SET likes_count = likes_count + 1 WHERE id = ?")->execute([$pubId]);
                $liked = true;
                $newCount = (int)$pub['likes_count'] + 1;

                if ($this->notificationRepo && (int)$pub['user_id'] !== $userId) {
                    $this->notificationRepo->createNotification(
                        (int)$pub['user_id'],
                        $userId,
                        'publication_like',
                        $pubId,
                        $pub['uuid'],
                        ['title' => $pub['title'] ?? '']
                    );
                }
            }

            return [
                'success' => true,
                'liked' => $liked,
                'likes_count' => $newCount
            ];
        } catch (\Throwable $e) {
            Logger::error("Error toggling like", ['exception' => $e, 'pub' => $pubUuid, 'user' => $userId]);
            return ['success' => false, 'message' => __('error.database')];
        }
    }

    /**
     * Obtener comentarios de una publicación
     */
    public function getComments(string $pubUuid, array $params = []): array {
        $limit = isset($params['limit']) ? max(1, min(100, (int)$params['limit'])) : 50;
        $offset = isset($params['offset']) ? max(0, (int)$params['offset']) : 0;
        $viewerUserId = $this->sessionManager->has('user_id') ? (int)$this->sessionManager->get('user_id') : null;

        try {
            $stmtPub = $this->pdoCanvases->prepare("SELECT id, comments_count FROM " . DB::TBL_PUBLICATIONS . " WHERE uuid = ? OR id = ? LIMIT 1");
            $stmtPub->execute([$pubUuid, $pubUuid]);
            $pub = $stmtPub->fetch(PDO::FETCH_ASSOC);

            if (!$pub) {
                return ['success' => false, 'message' => __('publications.not_found'), 'comments' => []];
            }

            $pubId = (int)$pub['id'];

            $stmt = $this->pdoCanvases->prepare("
                SELECT id, uuid, publication_id, user_id, content, created_at, updated_at
                FROM " . DB::TBL_PUBLICATION_COMMENTS . "
                WHERE publication_id = ?
                ORDER BY created_at ASC
                LIMIT {$limit} OFFSET {$offset}
            ");
            $stmt->execute([$pubId]);
            $commentRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Cargar usuarios de los comentarios
            $userIds = array_unique(array_column($commentRows, 'user_id'));
            $usersMap = [];
            if (!empty($userIds)) {
                $placeholders = implode(',', array_fill(0, count($userIds), '?'));
                $stmtUsers = $this->pdoIdentity->prepare("
                    SELECT u.id, u.uuid, u.username, u.identifier, u.profile_picture, u.subscription_tier, st.color as subscription_color
                    FROM " . DB::TBL_USERS . " u
                    LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                    WHERE u.id IN ({$placeholders})
                ");
                $stmtUsers->execute(array_values($userIds));
                while ($u = $stmtUsers->fetch(PDO::FETCH_ASSOC)) {
                    $usersMap[$u['id']] = $u;
                }
            }

            $comments = [];
            foreach ($commentRows as $row) {
                $author = $usersMap[$row['user_id']] ?? null;
                $authorIdentifier = $author ? ($author['identifier'] ?? strtolower(str_replace(' ', '_', $author['username']))) : 'unknown';

                $comments[] = [
                    'id' => (int)$row['id'],
                    'uuid' => $row['uuid'],
                    'content' => htmlspecialchars($row['content'], ENT_QUOTES, 'UTF-8'),
                    'created_at' => $row['created_at'],
                    'is_own' => $viewerUserId === (int)$row['user_id'],
                    'author' => [
                        'id' => (int)$row['user_id'],
                        'username' => $author['username'] ?? __('user'),
                        'identifier' => $authorIdentifier,
                        'handle' => '@' . $authorIdentifier,
                        'avatar_url' => $author ? Utils::getS3PublicUrl($author['profile_picture']) : Utils::getDefaultAvatarUrl('U'),
                        'subscription_tier' => (int)($author['subscription_tier'] ?? 0),
                        'subscription_color' => $author['subscription_color'] ?? '#000000'
                    ]
                ];
            }

            return [
                'success' => true,
                'comments' => $comments,
                'total_comments' => (int)$pub['comments_count'],
                'count' => count($comments)
            ];
        } catch (\Throwable $e) {
            Logger::error("Error fetching publication comments", ['exception' => $e, 'pub' => $pubUuid]);
            return ['success' => false, 'message' => __('error.database'), 'comments' => []];
        }
    }

    /**
     * Añadir comentario
     */
    public function addComment(array $data): array {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => __('auth.session_expired')];
        }

        $userId = (int)$this->sessionManager->get('user_id');
        $pubUuid = $data['publication_uuid'] ?? ($data['publication_id'] ?? '');
        $content = trim($data['content'] ?? '');

        if (empty($pubUuid) || empty($content)) {
            return ['success' => false, 'message' => __('publications.comment_required')];
        }

        if (mb_strlen($content) > 1000) {
            return ['success' => false, 'message' => __('publications.comment_too_long')];
        }

        $sanitizedContent = Utils::sanitizeText($content);

        try {
            $stmtPub = $this->pdoCanvases->prepare("SELECT id, user_id, uuid, title, comments_count FROM " . DB::TBL_PUBLICATIONS . " WHERE uuid = ? OR id = ? LIMIT 1");
            $stmtPub->execute([$pubUuid, $pubUuid]);
            $pub = $stmtPub->fetch(PDO::FETCH_ASSOC);

            if (!$pub) {
                return ['success' => false, 'message' => __('publications.not_found')];
            }

            $pubId = (int)$pub['id'];
            $commentUuid = Utils::generateUuid();

            $stmt = $this->pdoCanvases->prepare("
                INSERT INTO " . DB::TBL_PUBLICATION_COMMENTS . "
                (uuid, publication_id, user_id, content, created_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$commentUuid, $pubId, $userId, $sanitizedContent]);
            $commentId = (int)$this->pdoCanvases->lastInsertId();

            $this->pdoCanvases->prepare("UPDATE " . DB::TBL_PUBLICATIONS . " SET comments_count = comments_count + 1 WHERE id = ?")->execute([$pubId]);

            if ($this->notificationRepo && (int)$pub['user_id'] !== $userId) {
                $this->notificationRepo->createNotification(
                    (int)$pub['user_id'],
                    $userId,
                    'publication_comment',
                    $pubId,
                    $pub['uuid'],
                    [
                        'title' => $pub['title'] ?? '',
                        'comment_snippet' => mb_substr($sanitizedContent, 0, 80)
                    ]
                );
            }

            $author = $this->userRepository->findById($userId);
            $authorIdentifier = $author['identifier'] ?? strtolower(str_replace(' ', '_', $author['username']));

            $newComment = [
                'id' => $commentId,
                'uuid' => $commentUuid,
                'content' => htmlspecialchars($sanitizedContent, ENT_QUOTES, 'UTF-8'),
                'created_at' => date('Y-m-d H:i:s'),
                'is_own' => true,
                'author' => [
                    'id' => $userId,
                    'username' => $author['username'],
                    'identifier' => $authorIdentifier,
                    'handle' => '@' . $authorIdentifier,
                    'avatar_url' => Utils::getS3PublicUrl($author['profile_picture']),
                    'subscription_tier' => (int)($author['subscription_tier'] ?? 0),
                    'subscription_color' => $author['subscription_color'] ?? '#000000'
                ]
            ];

            return [
                'success' => true,
                'message' => __('publications.comment_added'),
                'comment' => $newComment,
                'comments_count' => (int)$pub['comments_count'] + 1
            ];
        } catch (\Throwable $e) {
            Logger::error("Error adding publication comment", ['exception' => $e, 'user_id' => $userId, 'pub' => $pubUuid]);
            return ['success' => false, 'message' => __('error.database')];
        }
    }

    /**
     * Eliminar comentario
     */
    public function deleteComment(array $data): array {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => __('auth.session_expired')];
        }

        $userId = (int)$this->sessionManager->get('user_id');
        $commentUuid = $data['comment_uuid'] ?? ($data['comment_id'] ?? '');

        if (empty($commentUuid)) {
            return ['success' => false, 'message' => __('validation.missing_fields')];
        }

        try {
            $stmt = $this->pdoCanvases->prepare("
                SELECT id, uuid, publication_id, user_id
                FROM " . DB::TBL_PUBLICATION_COMMENTS . "
                WHERE uuid = ? OR id = ?
                LIMIT 1
            ");
            $stmt->execute([$commentUuid, $commentUuid]);
            $comment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$comment) {
                return ['success' => false, 'message' => __('publications.comment_not_found')];
            }

            // Comprobar autorización (autor del comentario o administrador)
            $isOwner = (int)$comment['user_id'] === $userId;
            $isAdmin = false;
            $permissions = $this->sessionManager->get('user_permissions', '');
            if (strpos($permissions, 'admin') !== false || strpos($permissions, 'moderate') !== false) {
                $isAdmin = true;
            }

            if (!$isOwner && !$isAdmin) {
                return ['success' => false, 'message' => __('error.unauthorized')];
            }

            $pubId = (int)$comment['publication_id'];

            $this->pdoCanvases->prepare("DELETE FROM " . DB::TBL_PUBLICATION_COMMENTS . " WHERE id = ?")->execute([$comment['id']]);
            $this->pdoCanvases->prepare("UPDATE " . DB::TBL_PUBLICATIONS . " SET comments_count = GREATEST(0, comments_count - 1) WHERE id = ?")->execute([$pubId]);

            // Obtener nuevo contador
            $stmtCount = $this->pdoCanvases->prepare("SELECT comments_count FROM " . DB::TBL_PUBLICATIONS . " WHERE id = ?");
            $stmtCount->execute([$pubId]);
            $newCount = (int)$stmtCount->fetchColumn();

            return [
                'success' => true,
                'message' => __('publications.comment_deleted'),
                'comments_count' => $newCount
            ];
        } catch (\Throwable $e) {
            Logger::error("Error deleting comment", ['exception' => $e, 'comment' => $commentUuid]);
            return ['success' => false, 'message' => __('error.database')];
        }
    }

    /**
     * Eliminar publicación
     */
    public function deletePublication(array $data): array {
        if (!$this->sessionManager->has('user_id')) {
            return ['success' => false, 'message' => __('auth.session_expired')];
        }

        $userId = (int)$this->sessionManager->get('user_id');
        $pubUuid = $data['publication_uuid'] ?? ($data['uuid'] ?? '');

        try {
            $stmt = $this->pdoCanvases->prepare("SELECT id, uuid, user_id, image_path FROM " . DB::TBL_PUBLICATIONS . " WHERE uuid = ? OR id = ? LIMIT 1");
            $stmt->execute([$pubUuid, $pubUuid]);
            $pub = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$pub) {
                return ['success' => false, 'message' => __('publications.not_found')];
            }

            $isOwner = (int)$pub['user_id'] === $userId;
            $isAdmin = false;
            $permissions = $this->sessionManager->get('user_permissions', '');
            if (strpos($permissions, 'admin') !== false || strpos($permissions, 'moderate') !== false) {
                $isAdmin = true;
            }

            if (!$isOwner && !$isAdmin) {
                return ['success' => false, 'message' => __('error.unauthorized')];
            }

            // Eliminar de S3 / MinIO
            if (!empty($pub['image_path'])) {
                try {
                    $s3Key = Utils::normalizeStoragePath($pub['image_path']);
                    $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
                    $s3Client = Utils::getS3Client();
                    $s3Client->deleteObject([
                        'Bucket' => $bucket,
                        'Key'    => $s3Key
                    ]);
                } catch (\Throwable $e) {
                    Logger::error("Failed to delete publication image from S3", ['exception' => $e->getMessage(), 'key' => $pub['image_path']]);
                }
            }

            // Eliminar archivo físico local si existe
            if (!empty($pub['image_path'])) {
                $rootPath = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 3);
                $fullImgPath = $rootPath . '/storage/public/' . ltrim($pub['image_path'], '/');
                if (file_exists($fullImgPath) && is_file($fullImgPath)) {
                    @unlink($fullImgPath);
                }
            }

            // Eliminar registro (las cascadas eliminan likes y comentarios)
            $this->pdoCanvases->prepare("DELETE FROM " . DB::TBL_PUBLICATIONS . " WHERE id = ?")->execute([$pub['id']]);

            return ['success' => true, 'message' => __('publications.deleted_success')];
        } catch (\Throwable $e) {
            Logger::error("Error deleting publication", ['exception' => $e, 'pub' => $pubUuid]);
            return ['success' => false, 'message' => __('error.database')];
        }
    }

    /**
     * Hidratar posts con autor y estado de me gusta
     */
    private function hydrateAuthorAndLikeData(array $posts, ?int $viewerUserId = null, array $cachedUsers = []): array {
        if (empty($posts)) return [];

        $userIds = array_unique(array_column($posts, 'user_id'));
        $usersMap = $cachedUsers;

        $missingUserIds = array_diff($userIds, array_keys($usersMap));
        if (!empty($missingUserIds)) {
            $placeholders = implode(',', array_fill(0, count($missingUserIds), '?'));
            $stmtUsers = $this->pdoIdentity->prepare("
                SELECT u.id, u.uuid, u.username, u.identifier, u.profile_picture, u.banner_picture, u.subscription_tier, st.color as subscription_color
                FROM " . DB::TBL_USERS . " u
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                WHERE u.id IN ({$placeholders})
            ");
            $stmtUsers->execute(array_values($missingUserIds));
            while ($u = $stmtUsers->fetch(PDO::FETCH_ASSOC)) {
                $usersMap[$u['id']] = $u;
            }
        }

        // Likes del viewer
        $likedPubIds = [];
        if ($viewerUserId && !empty($posts)) {
            $pubIds = array_column($posts, 'id');
            $placeholders = implode(',', array_fill(0, count($pubIds), '?'));
            $stmtLikes = $this->pdoCanvases->prepare("
                SELECT publication_id FROM " . DB::TBL_PUBLICATION_LIKES . "
                WHERE user_id = ? AND publication_id IN ({$placeholders})
            ");
            $params = array_merge([$viewerUserId], $pubIds);
            $stmtLikes->execute($params);
            $likedPubIds = array_flip($stmtLikes->fetchAll(PDO::FETCH_COLUMN));
        }

        $result = [];
        foreach ($posts as $post) {
            $author = $usersMap[$post['user_id']] ?? null;
            $authorIdentifier = $author ? ($author['identifier'] ?? strtolower(str_replace(' ', '_', $author['username']))) : 'unknown';

            $tags = [];
            if (!empty($post['tags'])) {
                $decoded = is_array($post['tags']) ? $post['tags'] : json_decode($post['tags'], true);
                if (is_array($decoded)) $tags = $decoded;
            }

            $result[] = [
                'id' => (int)$post['id'],
                'uuid' => $post['uuid'],
                'title' => $post['title'],
                'description' => $post['description'] ?? '',
                'tags' => $tags,
                'image_url' => Utils::getS3PublicUrl($post['image_path']),
                'width' => (int)$post['width'],
                'height' => (int)$post['height'],
                'likes_count' => (int)$post['likes_count'],
                'views_count' => (int)$post['views_count'],
                'comments_count' => (int)$post['comments_count'],
                'privacy' => $post['privacy'],
                'created_at' => $post['created_at'],
                'is_liked' => isset($likedPubIds[$post['id']]),
                'is_owner' => $viewerUserId === (int)$post['user_id'],
                'author' => [
                    'id' => (int)$post['user_id'],
                    'username' => $author['username'] ?? __('user'),
                    'identifier' => $authorIdentifier,
                    'handle' => '@' . $authorIdentifier,
                    'avatar_url' => $author ? Utils::getS3PublicUrl($author['profile_picture']) : Utils::getDefaultAvatarUrl('U'),
                    'subscription_tier' => (int)($author['subscription_tier'] ?? 0),
                    'subscription_color' => $author['subscription_color'] ?? '#000000'
                ]
            ];
        }

        return $result;
    }
}
