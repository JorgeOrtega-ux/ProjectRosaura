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


        return in_array(\App\Core\System\PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $perms);
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
                return $this->respond(['success' => false, 'message' => __('err_captura_id_missing')]);
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
                return $this->respond(['success' => false, 'message' => __('err_captura_id_missing')]);
            }
            
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
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
                return $this->respond(['success' => false, 'message' => __('err_captura_id_missing')]);
            }
            
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
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
                return $this->respond(['success' => false, 'message' => __('err_captura_id_missing')]);
            }
            
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $result = $this->canvasServices->deleteSnapshot($id, $userId, $this->canManageOfficial());
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
