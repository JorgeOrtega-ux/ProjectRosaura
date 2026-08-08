<?php

namespace App\Api\Services\Canvas;

use Exception;
use DateTime;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\System\CacheConstants;
use App\Core\System\SubscriptionPlanConstants; 
use App\Config\Database\RedisCache;
use App\Config\Database\DatabaseManager;
use PDO;

class CanvasMediaService {
    private $canvasRepository;
    private $userRepository;

    public function __construct(CanvasRepositoryInterface $canvasRepository, UserRepositoryInterface $userRepository) {
        $this->canvasRepository = $canvasRepository;
        $this->userRepository = $userRepository;
    }

    public function getSnapshotsGallery(string $uuid, ?int $userId = null): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);
            $stmt = $pdo->prepare("SELECT id, owner_id, name, privacy, size FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1");
            $stmt->execute([':uuid' => $uuid]);
            $canvas = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }
            
            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($canvas['id'], $userId);
                $hasRole = !empty($roles);
            }

            $isOwner = ($canvas['owner_id'] === $userId);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $history = $this->canvasRepository->getSnapshotsHistoryByUuid($uuid);

            $formattedHistory = array_map(function($item) {
                $imageUrl = \App\Core\Helpers\Utils::getS3PublicUrl($item['file_path']);
                return [
                    'id' => $item['id'],
                    'url' => $imageUrl,
                    'date' => date('d/m/Y H:i', strtotime($item['created_at'])),
                    'snapshot_uuid' => $item['snapshot_uuid'],
                    'likes_count' => (int)($item['likes_count'] ?? 0),
                    'is_private' => ($item['privacy'] ?? '') === DB::PRIVACY_PRIVATE
                ];
            }, $history);

            return [
                'success' => true, 
                'data' => [
                    'canvas_name' => $canvas['name'],
                    'snapshots' => $formattedHistory
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error getting snapshots gallery.', ['uuid' => $uuid, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getSnapshotDetail(string $snapshotId, ?int $userId = null): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.file_path, s.snapshot_uuid, c.id as canvas_id, c.size, c.privacy, c.owner_id, c.palette_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :snapshot_id 
                LIMIT 1
            ");
            $stmt->execute([':snapshot_id' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return ['success' => false, 'message' => __('err_captura_not_found')];
            }

            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($data['canvas_id'], $userId);
                $hasRole = !empty($roles);
            }

            $isOwner = ($data['owner_id'] === $userId);

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $imageUrl = \App\Core\Helpers\Utils::getS3PublicUrl($data['file_path']);

            $sizeStr = strtolower($data['size']);
            if (strpos($sizeStr, 'x') !== false) {
                $parts = explode('x', $sizeStr);
                $width = (int)$parts[0];
                $height = isset($parts[1]) ? (int)$parts[1] : $width;
            } else {
                $width = (int)$sizeStr;
                $height = $width;
            }

            return [
                'success' => true,
                'data' => [
                    'image_url' => $imageUrl,
                    'width' => $width,
                    'height' => $height,
                    'size' => $data['size'],
                    'palette_id' => $data['palette_id']
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error getting snapshot detail.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
    public function toggleSnapshotLike(string $snapshotId, int $userId): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("SELECT id FROM canvas_snapshots_history WHERE snapshot_uuid = :uuid LIMIT 1");
            $stmt->execute([':uuid' => $snapshotId]);
            $snapshot = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$snapshot) {
                return ['success' => false, 'message' => __('err_captura_not_found')];
            }

            $snapshotIntId = $snapshot['id'];

            $stmt = $pdo->prepare("SELECT id FROM canvas_snapshots_likes WHERE snapshot_id = :sid AND user_id = :uid LIMIT 1");
            $stmt->execute([':sid' => $snapshotIntId, ':uid' => $userId]);
            $like = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($like) {
                $stmt = $pdo->prepare("DELETE FROM canvas_snapshots_likes WHERE id = :id");
                $stmt->execute([':id' => $like['id']]);
                $action = 'removed';
            } else {
                $stmt = $pdo->prepare("INSERT INTO canvas_snapshots_likes (snapshot_id, user_id) VALUES (:sid, :uid)");
                $stmt->execute([':sid' => $snapshotIntId, ':uid' => $userId]);
                $action = 'added';
            }

            return ['success' => true, 'data' => ['action' => $action]];

        } catch (Exception $e) {
            Logger::error('Error toggling snapshot like.', ['snapshot_uuid' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function toggleSnapshotPrivacy(string $snapshotId, int $userId): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.id, s.privacy, c.owner_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :uuid 
                LIMIT 1
            ");
            $stmt->execute([':uuid' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return ['success' => false, 'message' => __('err_captura_not_found')];
            }

            $isOwner = ($data['owner_id'] === $userId);

            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $newPrivacy = ($data['privacy'] === \App\Core\System\CanvasConstants::PRIVACY_PUBLIC) ? 'private' : 'public';

            $stmt = $pdo->prepare("UPDATE canvas_snapshots_history SET privacy = :priv WHERE id = :id");
            $stmt->execute([':priv' => $newPrivacy, ':id' => $data['id']]);

            return ['success' => true, 'data' => ['privacy' => $newPrivacy], 'message' => __('msg_privacy_updated')];

        } catch (Exception $e) {
            Logger::error('Error toggling snapshot privacy.', ['snapshot_uuid' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function deleteSnapshot(string $snapshotId, int $userId): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.id, s.file_path, c.owner_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :uuid 
                LIMIT 1
            ");
            $stmt->execute([':uuid' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return ['success' => false, 'message' => __('err_captura_not_found')];
            }

            $isOwner = ($data['owner_id'] === $userId);

            if (!$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $stmt = $pdo->prepare("DELETE FROM canvas_snapshots_history WHERE id = :id");
            $stmt->execute([':id' => $data['id']]);

            $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
            $s3Client = Utils::getS3Client();

            if (!empty($data['file_path'])) {
                $s3Key = ltrim($data['file_path'], '/');
                try {
                    $s3Client->deleteObject(['Bucket' => $bucket, 'Key' => $s3Key]);
                } catch (\Exception $e) {
                    Logger::warning("Failed deleting S3 object for snapshot", ['key' => $s3Key, 'exception' => $e]);
                }
            }

            return ['success' => true, 'message' => __('msg_captura_deleted')];

        } catch (Exception $e) {
            Logger::error('Error deleting snapshot.', ['snapshot_uuid' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
