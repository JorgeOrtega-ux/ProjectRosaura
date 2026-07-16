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

    public function prepareTimelapseDownload(?int $userId, int $canvasId, bool $canManageOfficial = false): array {
        try {
            $canvas = $this->canvasRepository->getById($canvasId);
            if (!$canvas) {
                return ['success' => false, 'message' => __('err_canvas_not_found')];
            }

            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($canvasId, $userId);
                $hasRole = !empty($roles);
            }
            
            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

            if ($canvas['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
            }

            $s3Key = 'timelapses/' . $canvas['uuid'] . '/live/live_canvas_' . $canvas['uuid'] . '.jsonl';

            $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
            $s3Client = Utils::getS3Client();

            if (!$s3Client->doesObjectExist($bucket, $s3Key)) {
                return ['success' => false, 'message' => __('err_no_timelapse_data'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
            }

            return ['success' => true, 'file_path' => $s3Key];

        } catch (Exception $e) {
            Logger::error('Error preparing timelapse download.', ['canvas_id' => $canvasId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function prepareSnapshotTimelapseDownload(?int $userId, string $snapshotId, bool $canManageOfficial = false): array {
        try {
            $tx0 = microtime(true);
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.timelapse_file_path, c.id as canvas_id, c.privacy, c.owner_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :snapshot_id 
                LIMIT 1
            ");
            $stmt->execute([':snapshot_id' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            $tx1 = microtime(true);

            if (!$data) {
                return ['success' => false, 'message' => __('err_snapshot_not_found'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
            }

            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($data['canvas_id'], $userId);
                $hasRole = !empty($roles);
            }
            $tx2 = microtime(true);

            $isOwner = ($data['owner_id'] === $userId) || ($data['owner_id'] === null && $canManageOfficial);

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized_view_timelapse'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN];
            }

            if (empty($data['timelapse_file_path'])) {
                return ['success' => false, 'message' => __('err_no_timelapse_file'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
            }

            $s3Key = ltrim($data['timelapse_file_path'], '/');
            if (str_starts_with($s3Key, 'private/canvases/')) {
                $s3Key = str_replace('private/canvases/', '', $s3Key);
            }

            $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
            $tx3 = microtime(true);
            
            // NOTE: REMOVED doesObjectExist to avoid redundant S3 call. 
            // The controller already checks headObject.
            // $s3Client = Utils::getS3Client();
            // if (!$s3Client->doesObjectExist($bucket, $s3Key)) {
            //     return ['success' => false, 'message' => __('err_physical_file_missing'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND];
            // }
            $tx4 = microtime(true);

            \App\Core\System\Logger::info("prepareSnapshotTiming", [
                'db_query' => round($tx1 - $tx0, 4),
                'getMemberRoles' => round($tx2 - $tx1, 4),
                'pre_s3' => round($tx3 - $tx2, 4),
                's3_doesObjectExist' => round($tx4 - $tx3, 4)
            ]);

            return ['success' => true, 'file_path' => $s3Key];

        } catch (Exception $e) {
            Logger::error('Error preparing snapshot timelapse.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_internal_server_error'), 'http_code' => 500];
        }
    }

    public function getSnapshotsGallery(string $uuid, ?int $userId = null, bool $canManageOfficial = false): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);
            $stmt = $pdo->prepare("SELECT id, owner_id, name, privacy FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid LIMIT 1");
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

            $isOwner = ($canvas['owner_id'] === $userId) || ($canvas['owner_id'] === null && $canManageOfficial);

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

    public function getSnapshotDetail(string $snapshotId, ?int $userId = null, bool $canManageOfficial = false): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.file_path, s.timelapse_file_path, s.snapshot_uuid, c.id as canvas_id, c.size, c.privacy, c.owner_id, c.palette_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :snapshot_id 
                LIMIT 1
            ");
            $stmt->execute([':snapshot_id' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return ['success' => false, 'message' => __('err_snapshot_not_found')];
            }

            $hasRole = false;
            if ($userId !== null) {
                $roles = $this->canvasRepository->getMemberRoles($data['canvas_id'], $userId);
                $hasRole = !empty($roles);
            }

            $isOwner = ($data['owner_id'] === $userId) || ($data['owner_id'] === null && $canManageOfficial);

            if ($data['privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $imageUrl = \App\Core\Helpers\Utils::getS3PublicUrl($data['file_path']);

            $hasTimelapse = !empty($data['timelapse_file_path']);

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
                    'has_timelapse' => $hasTimelapse,
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
                return ['success' => false, 'message' => __('err_snapshot_not_found')];
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

    public function toggleSnapshotPrivacy(string $snapshotId, int $userId, bool $canManageOfficial = false): array {
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
                return ['success' => false, 'message' => __('err_snapshot_not_found')];
            }

            $isOwner = ($data['owner_id'] === $userId) || ($data['owner_id'] === null && $canManageOfficial);

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

    public function deleteSnapshot(string $snapshotId, int $userId, bool $canManageOfficial = false): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.id, s.file_path, s.timelapse_file_path, c.owner_id 
                FROM canvas_snapshots_history s
                JOIN " . DB::TBL_CANVASES . " c ON s.canvas_id = c.id
                WHERE s.snapshot_uuid = :uuid 
                LIMIT 1
            ");
            $stmt->execute([':uuid' => $snapshotId]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$data) {
                return ['success' => false, 'message' => __('err_snapshot_not_found')];
            }

            $isOwner = ($data['owner_id'] === $userId) || ($data['owner_id'] === null && $canManageOfficial);

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
                } catch (\Exception $e) {}
            }

            if (!empty($data['timelapse_file_path'])) {
                $s3Key = ltrim($data['timelapse_file_path'], '/');
                if (str_starts_with($s3Key, 'private/canvases/')) {
                    $s3Key = str_replace('private/canvases/', '', $s3Key);
                }
                try {
                    $s3Client->deleteObject(['Bucket' => $bucket, 'Key' => $s3Key]);
                } catch (\Exception $e) {}
            }

            return ['success' => true, 'message' => __('msg_snapshot_deleted')];

        } catch (Exception $e) {
            Logger::error('Error deleting snapshot.', ['snapshot_uuid' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
