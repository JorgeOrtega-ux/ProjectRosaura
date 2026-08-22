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
            $stmt = $pdo->prepare("SELECT id, owner_id, name, privacy, size FROM " . DB::TBL_CANVASES . " WHERE uuid = :uuid AND deleted_at IS NULL LIMIT 1");
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

            $formattedHistory = [];
            foreach ($history as $item) {
                $isPrivateSnapshot = (($item['privacy'] ?? '') === DB::PRIVACY_PRIVATE);
                if ($isPrivateSnapshot && !$isOwner) {
                    continue;
                }
                $imageUrl = \App\Core\Helpers\Utils::getS3PublicUrl($item['file_path']);
                $formattedHistory[] = [
                    'id' => $item['id'],
                    'url' => $imageUrl,
                    'date' => date('d/m/Y H:i', strtotime($item['created_at'])),
                    'snapshot_uuid' => $item['snapshot_uuid'],
                    'likes_count' => (int)($item['likes_count'] ?? 0),
                    'is_private' => $isPrivateSnapshot
                ];
            }

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
                SELECT s.file_path, s.timelapse_path, s.snapshot_uuid, s.privacy as snapshot_privacy, c.id as canvas_id, c.size, c.privacy as canvas_privacy, c.owner_id, c.palette_id 
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

            if ($data['snapshot_privacy'] === DB::PRIVACY_PRIVATE && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($data['canvas_privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
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
                    'palette_id' => $data['palette_id'],
                    'has_timelapse' => !empty($data['timelapse_path']),
                    'timelapse_path' => $data['timelapse_path'] ?? null
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error getting snapshot detail.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function getSnapshotTimelapse(string $snapshotId, ?int $userId = null): array {
        try {
            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.file_path, s.timelapse_path, s.snapshot_uuid, s.privacy as snapshot_privacy, c.id as canvas_id, c.size, c.privacy as canvas_privacy, c.owner_id, c.palette_id, c.uuid as canvas_uuid
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

            if ($data['snapshot_privacy'] === DB::PRIVACY_PRIVATE && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($data['canvas_privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $sizeStr = strtolower($data['size']);
            if (strpos($sizeStr, 'x') !== false) {
                $parts = explode('x', $sizeStr);
                $width = (int)$parts[0];
                $height = isset($parts[1]) ? (int)$parts[1] : $width;
            } else {
                $width = (int)$sizeStr;
                $height = $width;
            }

            $jsonlContent = null;
            $timelapsePath = $data['timelapse_path'] ?? null;
            
            if (!$timelapsePath) {
                $timelapsePath = "snapshots_timelapse/{$data['canvas_uuid']}/{$data['snapshot_uuid']}.jsonl";
            }

            $rootDir = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 3);
            $localPath = $rootDir . '/storage/timelapses/snapshots/' . $data['snapshot_uuid'] . '.jsonl';
            if (file_exists($localPath)) {
                $jsonlContent = file_get_contents($localPath);
            }

            if (!$jsonlContent && !empty($timelapsePath)) {
                try {
                    $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
                    $s3Client = Utils::getS3Client();
                    $s3Obj = $s3Client->getObject([
                        'Bucket' => $bucket,
                        'Key' => ltrim($timelapsePath, '/')
                    ]);
                    if ($s3Obj && isset($s3Obj['Body'])) {
                        $jsonlContent = (string)$s3Obj['Body'];
                        try {
                            $dir = dirname($localPath);
                            if (!is_dir($dir)) {
                                @mkdir($dir, 0755, true);
                            }
                            @file_put_contents($localPath, $jsonlContent);
                        } catch (\Throwable $cacheErr) {
                            Logger::warning("Could not cache timelapse to local disk: " . $cacheErr->getMessage(), ['path' => $localPath]);
                        }
                    }
                } catch (\Throwable $s3Err) {
                    Logger::warning("Could not fetch timelapse from S3: " . $s3Err->getMessage(), ['key' => $timelapsePath]);
                }
            }

            if (!$jsonlContent) {
                return [
                    'success' => false,
                    'message' => __('msg_no_timelapse_data')
                ];
            }

            $events = [];
            $trimmed = trim($jsonlContent);
            if (!empty($trimmed)) {
                // Decode entire JSONL as a single JSON array in one native C call (100x faster than looping json_decode)
                $jsonArray = '[' . preg_replace('/[\r\n]+/', ',', $trimmed) . ']';
                $decoded = json_decode($jsonArray, true);
                if (is_array($decoded)) {
                    $events = $decoded;
                }
            }

            // Fallback line-by-line if JSONL had malformed lines
            if (empty($events) && !empty($trimmed)) {
                $lines = explode("\n", $jsonlContent);
                foreach ($lines as $line) {
                    $l = trim($line);
                    if (empty($l)) continue;
                    $d = json_decode($l, true);
                    if ($d && is_array($d)) {
                        $events[] = $d;
                    }
                }
            }

            if (empty($events)) {
                return [
                    'success' => false,
                    'message' => __('msg_no_timelapse_data')
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'snapshot_id' => $snapshotId,
                    'events' => $events,
                    'total' => count($events),
                    'width' => $width,
                    'height' => $height,
                    'size' => $data['size']
                ]
            ];

        } catch (Exception $e) {
            Logger::error('Error getting snapshot timelapse.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
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
                SELECT s.id, s.privacy, s.canvas_id, c.owner_id 
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

            try {
                $redis = (new \App\Config\Database\RedisCache())->getClient();
                (new \App\Core\System\CacheInvalidator($redis))->canvasSnapshots((int)$data['canvas_id']);
            } catch (\Throwable $e) {}

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
                SELECT s.id, s.file_path, s.timelapse_path, s.snapshot_uuid, s.canvas_id, c.owner_id 
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

            try {
                $redis = (new \App\Config\Database\RedisCache())->getClient();
                (new \App\Core\System\CacheInvalidator($redis))->canvasSnapshots((int)$data['canvas_id']);
            } catch (\Throwable $e) {}

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

            if (!empty($data['timelapse_path'])) {
                $s3TlKey = ltrim($data['timelapse_path'], '/');
                try {
                    $s3Client->deleteObject(['Bucket' => $bucket, 'Key' => $s3TlKey]);
                } catch (\Exception $e) {
                    Logger::warning("Failed deleting S3 timelapse object for snapshot", ['key' => $s3TlKey, 'exception' => $e]);
                }
            }

            $rootDir = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 3);
            $localTlPath = $rootDir . '/storage/timelapses/snapshots/' . $data['snapshot_uuid'] . '.jsonl';
            if (file_exists($localTlPath)) {
                @unlink($localTlPath);
            }

            return ['success' => true, 'message' => __('msg_captura_deleted')];

        } catch (Exception $e) {
            Logger::error('Error deleting snapshot.', ['snapshot_uuid' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }

    public function exportSnapshotTimelapseVideo(string $snapshotId, int $duration = 30, string $quality = '1080p', ?int $userId = null): array {
        try {
            if (!in_array($duration, [15, 30, 60])) {
                $duration = 30;
            }

            if (!in_array($quality, ['720p', '1080p', '4k'])) {
                $quality = '1080p';
            }

            $userTier = (int)($_SESSION['subscription_tier'] ?? 0);
            if ($userTier === 0 && $userId !== null) {
                try {
                    $userDb = (new DatabaseManager())->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
                    $uStmt = $userDb->prepare("SELECT subscription_tier, is_admin FROM users WHERE id = :uid LIMIT 1");
                    $uStmt->execute([':uid' => $userId]);
                    $uRow = $uStmt->fetch(\PDO::FETCH_ASSOC);
                    if ($uRow) {
                        $userTier = (int)($uRow['subscription_tier'] ?? 0);
                        if (!empty($uRow['is_admin'])) {
                            $userTier = 99;
                        }
                    }
                } catch (\Throwable $e) {}
            }
            $isAdmin = !empty($_SESSION['is_admin']) || ($userTier >= 99);
            if (!$isAdmin && !SubscriptionPlanConstants::hasFeature($userTier, 'export_timelapse')) {
                return [
                    'success' => false,
                    'message' => __('err_timelapse_export_requires_premium')
                ];
            }

            $qualityMap = [
                '720p' => 1280,
                '1080p' => 1920,
                '4k' => 3840
            ];
            $targetMaxDim = $qualityMap[$quality] ?? 1920;

            $db = new DatabaseManager();
            $pdo = $db->getConnection(DB::CONN_CANVASES);

            $stmt = $pdo->prepare("
                SELECT s.file_path, s.timelapse_path, s.snapshot_uuid, s.privacy as snapshot_privacy, c.id as canvas_id, c.size, c.privacy as canvas_privacy, c.owner_id, c.palette_id, c.uuid as canvas_uuid
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

            if ($data['snapshot_privacy'] === DB::PRIVACY_PRIVATE && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            if ($data['canvas_privacy'] === DB::PRIVACY_PRIVATE && !$hasRole && !$isOwner) {
                return ['success' => false, 'message' => __('err_unauthorized')];
            }

            $rootDir = defined('ROOT_PATH') ? ROOT_PATH : dirname(__DIR__, 3);
            $s3VideoKey = "snapshots_videos/{$data['canvas_uuid']}/{$data['snapshot_uuid']}_{$duration}s_{$quality}.mp4";
            $localVideoDir = $rootDir . '/storage/timelapses/videos';
            if (!is_dir($localVideoDir)) {
                @mkdir($localVideoDir, 0755, true);
            }
            $localVideoPath = "{$localVideoDir}/{$data['snapshot_uuid']}_{$duration}s_{$quality}.mp4";
            $publicUrl = \App\Core\Helpers\Utils::getS3PublicUrl($s3VideoKey) . '?v=' . time();

            $bucket = \App\Core\Helpers\EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
            $s3Client = Utils::getS3Client();

            // 1. Check S3 if already exists
            try {
                if ($s3Client->doesObjectExist($bucket, $s3VideoKey)) {
                    return [
                        'success' => true,
                        'status' => 'ready',
                        'data' => [
                            'url' => $publicUrl,
                            'duration' => $duration,
                            'quality' => $quality,
                            'filename' => "timelapse_{$snapshotId}_{$duration}s_{$quality}.mp4"
                        ]
                    ];
                }
            } catch (\Throwable $e) {}

            // 2. Check if local video already exists and upload to S3 if complete
            if (file_exists($localVideoPath) && filesize($localVideoPath) > 1000) {
                try {
                    $s3Client->putObject([
                        'Bucket' => $bucket,
                        'Key' => $s3VideoKey,
                        'SourceFile' => $localVideoPath,
                        'ContentType' => 'video/mp4',
                        'ContentDisposition' => 'attachment; filename="timelapse_' . $snapshotId . '_' . $duration . 's_' . $quality . '.mp4"'
                    ]);
                    return [
                        'success' => true,
                        'status' => 'ready',
                        'data' => [
                            'url' => $publicUrl,
                            'duration' => $duration,
                            'quality' => $quality,
                            'filename' => "timelapse_{$snapshotId}_{$duration}s_{$quality}.mp4"
                        ]
                    ];
                } catch (\Throwable $e) {
                    Logger::warning("Could not sync local video to S3: " . $e->getMessage());
                }
            }

            // 3. Ensure JSONL timelapse file is available locally
            $localJsonlPath = $rootDir . '/storage/timelapses/snapshots/' . $data['snapshot_uuid'] . '.jsonl';
            $timelapsePath = $data['timelapse_path'] ?? "snapshots_timelapse/{$data['canvas_uuid']}/{$data['snapshot_uuid']}.jsonl";
            
            if (!file_exists($localJsonlPath)) {
                try {
                    $s3Obj = $s3Client->getObject([
                        'Bucket' => $bucket,
                        'Key' => ltrim($timelapsePath, '/')
                    ]);
                    if ($s3Obj && isset($s3Obj['Body'])) {
                        $dir = dirname($localJsonlPath);
                        if (!is_dir($dir)) @mkdir($dir, 0755, true);
                        @file_put_contents($localJsonlPath, (string)$s3Obj['Body']);
                    }
                } catch (\Throwable $s3Err) {
                    Logger::warning("Could not fetch timelapse from S3: " . $s3Err->getMessage());
                }
            }

            if (!file_exists($localJsonlPath)) {
                return [
                    'success' => false,
                    'message' => __('msg_no_timelapse_data')
                ];
            }



            try {
                $redis = (new \App\Config\Database\RedisCache())->getClient();
                $lockKey = "lock:timelapse_job:{$data['snapshot_uuid']}_{$duration}s_{$quality}";
                $acquired = $redis->set($lockKey, (string)time(), ['NX', 'EX' => 180]);
                if ($acquired) {
                    $taskPayload = json_encode([
                        'snapshot_uuid' => $data['snapshot_uuid'],
                        'canvas_uuid' => $data['canvas_uuid'],
                        'duration' => $duration,
                        'quality' => $quality,
                        'fps' => 30,
                        'target_max_dim' => $targetMaxDim
                    ]);
                    try {
                        $redis->executeRaw(['XADD', 'stream:canvas_timelapse_video', '*', 'payload', $taskPayload]);
                    } catch (\Throwable $eStream) {
                        $redis->rpush('queue:canvas_timelapse_video', $taskPayload);
                    }
                }
                return [
                    'success' => true,
                    'status' => 'processing',
                    'message' => __('msg_generating_timelapse_video')
                ];
            } catch (\Throwable $e) {
                return ['success' => false, 'message' => __('err_server')];
            }

        } catch (Exception $e) {
            Logger::error('Error exporting snapshot timelapse video.', ['snapshot_id' => $snapshotId, 'error' => $e->getMessage()]);
            return ['success' => false, 'message' => __('err_database')];
        }
    }
}
