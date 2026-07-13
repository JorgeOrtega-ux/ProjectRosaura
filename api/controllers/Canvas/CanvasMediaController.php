<?php

namespace App\Api\Controllers\Canvas;

use App\Api\Controllers\BaseController;

use App\Api\Services\Canvas\CanvasMediaService;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Security\TurnstileValidator;
use App\Config\Database\RedisCache;

class CanvasMediaController extends BaseController {
    private $canvasServices;
    private $session;

    public function __construct(CanvasMediaService $canvasServices, SessionManagerInterface $session) {
        $this->canvasServices = $canvasServices;
        $this->session = $session;
    }


    /**
     * Función auxiliar para verificar si el usuario tiene el permiso de gestionar lienzos oficiales.
     */
    private function canManageOfficial(): bool {
        $perms = [];
        

        if (method_exists($this->session, 'getPermissions')) {
            $perms = $this->session->getPermissions();
        }
        

        if (empty($perms) && isset($_SESSION['user_permissions'])) {
            $perms = $_SESSION['user_permissions'];
        } elseif (empty($perms) && isset($_SESSION['permissions'])) {
            $perms = $_SESSION['permissions'];
        }
        
        if (!is_array($perms)) {
            $perms = [];
        }


        return in_array('access_admin_panel', $perms) || 
               in_array('canvases.manage_official', $perms);
    }

    public function get_timelapse($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $canvasId = $input['id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id'), 'http_code' => 400]);
            }

            $result = $this->canvasServices->prepareTimelapseDownload($userId, (int)$canvasId, $this->canManageOfficial());

            if (!$result['success']) {
                $code = $result['http_code'] ?? 400;
                http_response_code($code);
                return $this->respond($result);
            }

            $s3Key = $result['file_path'];
            $bucket = \App\Core\Helpers\EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
            $s3Client = \App\Core\Helpers\Utils::getS3Client();

            try {
                $head = $s3Client->headObject([
                    'Bucket' => $bucket,
                    'Key' => $s3Key
                ]);
            } catch (\Exception $e) {
                return $this->respond(['success' => false, 'message' => __('err_physical_file_missing'), 'http_code' => 404]);
            }

            if (ob_get_level()) {
                ob_end_clean();
            }

            header('Content-Type: application/x-ndjson');
            header('Content-Disposition: attachment; filename="timelapse_' . $canvasId . '.jsonl"');
            header('Content-Length: ' . $head['ContentLength']);
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            flush();
            $s3Client->getObject([
                'Bucket' => $bucket,
                'Key' => $s3Key,
                'SaveAs' => 'php://output'
            ]);
            exit;

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_snapshot_timelapse($input) {
        try {
            $t0 = microtime(true);
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $snapshotId = $input['id'] ?? null;

            if (!$snapshotId) {
                return $this->respond(['success' => false, 'message' => __('err_snapshot_id_missing'), 'http_code' => 400]);
            }

            $result = $this->canvasServices->prepareSnapshotTimelapseDownload($userId, $snapshotId, $this->canManageOfficial());
            $t1 = microtime(true);

            if (!$result['success']) {
                $code = $result['http_code'] ?? 400;
                http_response_code($code);
                return $this->respond($result);
            }

            $s3Key = $result['file_path'];
            $bucket = \App\Core\Helpers\EnvLoader::get('MINIO_BUCKET', 'rosaura-storage');
            $s3Client = \App\Core\Helpers\Utils::getS3Client();
            $t2 = microtime(true);

            try {
                $head = $s3Client->headObject([
                    'Bucket' => $bucket,
                    'Key' => $s3Key
                ]);
            } catch (\Exception $e) {
                return $this->respond(['success' => false, 'message' => __('err_physical_file_missing'), 'http_code' => 404]);
            }
            $t3 = microtime(true);

            if (ob_get_level()) {
                ob_end_clean();
            }

            session_write_close();
            $t4 = microtime(true);

            \App\Core\System\Logger::info("Timelapse PHP Timings", [
                'prepare' => round($t1 - $t0, 4),
                'getS3Client' => round($t2 - $t1, 4),
                'headObject' => round($t3 - $t2, 4),
                'sessionClose' => round($t4 - $t3, 4),
                'total_before_headers' => round($t4 - $t0, 4)
            ]);

            header('Content-Type: application/x-ndjson');
            header('Content-Disposition: attachment; filename="snapshot_timelapse_' . $snapshotId . '.jsonl"');
            header('Content-Length: ' . $head['ContentLength']);
            header('Cache-Control: no-cache, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            flush();
            $stream = fopen('php://output', 'w');
            $s3Client->getObject([
                'Bucket' => $bucket,
                'Key' => $s3Key,
                'SaveAs' => $stream
            ]);
            if (is_resource($stream)) {
                fclose($stream);
            }
            exit;

        } catch (\Throwable $e) {
            echo "ERROR PHP: " . $e->getMessage() . " en " . $e->getFile() . ":" . $e->getLine();
            exit;
        }
    }

    public function get_snapshots_gallery($input) {
        try {
            $uuid = $input['uuid'] ?? null;
            if (!$uuid) {
                return $this->respond(['success' => false, 'message' => __('err_uuid_missing')]);
            }
            
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;

            $result = $this->canvasServices->getSnapshotsGallery($uuid, $userId, $this->canManageOfficial());
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_snapshot_detail($input) {
        try {
            $id = $input['id'] ?? null;
            if (!$id) {
                return $this->respond(['success' => false, 'message' => __('err_snapshot_id_missing')]);
            }
            
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;

            $result = $this->canvasServices->getSnapshotDetail($id, $userId, $this->canManageOfficial());
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
    public function toggle_snapshot_like($input) {
        try {
            $id = $input['id'] ?? null;
            if (!$id) {
                return $this->respond(['success' => false, 'message' => __('err_snapshot_id_missing')]);
            }
            
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $result = $this->canvasServices->toggleSnapshotLike($id, $userId);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function toggle_snapshot_privacy($input) {
        try {
            $id = $input['id'] ?? null;
            if (!$id) {
                return $this->respond(['success' => false, 'message' => __('err_snapshot_id_missing')]);
            }
            
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $result = $this->canvasServices->toggleSnapshotPrivacy($id, $userId, $this->canManageOfficial());
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete_snapshot($input) {
        try {
            $id = $input['id'] ?? null;
            if (!$id) {
                return $this->respond(['success' => false, 'message' => __('err_snapshot_id_missing')]);
            }
            
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $result = $this->canvasServices->deleteSnapshot($id, $userId, $this->canManageOfficial());
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
