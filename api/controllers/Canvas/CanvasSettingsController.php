<?php

namespace App\Api\Controllers\Canvas;

use App\Api\Controllers\BaseController;

use App\Api\Services\Canvas\CanvasSettingsService;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Security\TurnstileValidator;
use App\Config\Database\RedisCache;

class CanvasSettingsController extends BaseController {
    private $canvasServices;
    private $session;

    public function __construct(CanvasSettingsService $canvasServices, SessionManagerInterface $session) {
        $this->canvasServices = $canvasServices;
        $this->session = $session;
    }




 public function resize($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            $newSize = $input['size'] ?? null;
            
            if (!$canvasId || !$newSize) {
                return $this->respond(['success' => false, 'message' => __('err_resize_params_missing')]);
            }


            $validSizes = array_keys(\App\Core\Helpers\Utils::getCanvasSizes());
            if (!in_array($newSize, $validSizes)) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_size')]);
            }

            $result = $this->canvasServices->resizeCanvas($userId, (int)$canvasId, $newSize);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_resize_settings($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }
            
            return $this->respond($this->canvasServices->getResizeSettings($userId, (int)$canvasId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function update_resize_settings($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }
            
            $data = [
                'is_active' => filter_var($input['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'next_resize_at' => $input['next_resize_at'] ?? null,
                'target_size' => $input['target_size'] ?? '64x64'
            ];
            
            return $this->respond($this->canvasServices->updateResizeSettings($userId, (int)$canvasId, $data));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function reset_now($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }
            
            $takeSnapshot = filter_var($input['take_snapshot'] ?? false, FILTER_VALIDATE_BOOLEAN);
            
            return $this->respond($this->canvasServices->resetCanvasNow($userId, (int)$canvasId, $takeSnapshot));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function create_snapshot($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }
            
            return $this->respond($this->canvasServices->createSnapshot($userId, (int)$canvasId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function snapshot_status($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }
            
            return $this->respond($this->canvasServices->getSnapshotStatus($userId, (int)$canvasId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_reset_settings($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }
            
            return $this->respond($this->canvasServices->getResetSettings($userId, (int)$canvasId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function update_reset_settings($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }
            
            $data = [
                'is_active' => filter_var($input['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'next_reset_at' => $input['next_reset_at'] ?? null,
                'take_snapshot' => filter_var($input['take_snapshot'] ?? true, FILTER_VALIDATE_BOOLEAN)
            ];
            
            return $this->respond($this->canvasServices->updateResetSettings($userId, (int)$canvasId, $data));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_roles($request) {
        if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized')]);
        $canvasUuid = $request['canvas_uuid'] ?? $request['uuid'] ?? $request['canvas_id'] ?? null;
        if (!$canvasUuid) return $this->respond(['success' => false, 'message' => __('err_canvas_not_specified')]);
        
        $canvasViewService = new \App\Api\Services\Canvas\CanvasViewService();
        $result = $canvasViewService->getCanvasRolesData((string)$canvasUuid);
        if (!empty($result['unauthorized'])) {
            return $this->respond(['success' => false, 'message' => __('err_unauthorized')]);
        }
        return $this->respond(['success' => true, 'data' => $result]);
    }

    public function get_permissions($request) {
        if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized')]);
        $userId = $this->session->getActiveAccountId();
        $canvasTarget = $request['canvas_id'] ?? $request['canvas_uuid'] ?? $request['uuid'] ?? null;
        if (!$canvasTarget) return $this->respond(['success' => false, 'message' => __('err_canvas_not_specified')]);
        
        $canvasId = (int)$canvasTarget;
        if (!is_numeric($canvasTarget)) {
            $canvasRepo = new \App\Core\Repositories\CanvasRepository();
            $canvas = $canvasRepo->getByUuid((string)$canvasTarget);
            if ($canvas) $canvasId = (int)$canvas['id'];
        }

        $result = $this->canvasServices->getCanvasPermissions($userId, $canvasId);
        return $this->respond($result);
    }

    public function create_role($request) {
        if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized')]);
        $userId = $this->session->getActiveAccountId();
        
        $canvasTarget = $request['canvas_id'] ?? $request['canvas_uuid'] ?? $request['uuid'] ?? null;
        $name = $request['name'] ?? null;
        $permissions = $request['permissions'] ?? [];
        $weight = isset($request['weight']) ? (int)$request['weight'] : 10;
        
        if (!$canvasTarget || !$name) return $this->respond(['success' => false, 'message' => __('err_missing_required_params')]);
        
        $canvasId = (int)$canvasTarget;
        if (!is_numeric($canvasTarget)) {
            $canvasRepo = new \App\Core\Repositories\CanvasRepository();
            $canvas = $canvasRepo->getByUuid((string)$canvasTarget);
            if ($canvas) $canvasId = (int)$canvas['id'];
        }

        $result = $this->canvasServices->createCanvasRole($userId, $canvasId, $name, $permissions, $weight);
        return $this->respond($result);
    }

    public function update_role($request) {
        if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized')]);
        $userId = $this->session->getActiveAccountId();
        
        $roleId = $request['role_id'] ?? null;
        $canvasTarget = $request['canvas_id'] ?? $request['canvas_uuid'] ?? $request['uuid'] ?? null;
        $name = $request['name'] ?? null;
        $permissions = isset($request['permissions']) ? $request['permissions'] : null;
        $weight = isset($request['weight']) ? (int)$request['weight'] : 10;
        
        if (!$roleId || !$canvasTarget || !$name) return $this->respond(['success' => false, 'message' => __('err_missing_required_params')]);
        
        $canvasId = (int)$canvasTarget;
        if (!is_numeric($canvasTarget)) {
            $canvasRepo = new \App\Core\Repositories\CanvasRepository();
            $canvas = $canvasRepo->getByUuid((string)$canvasTarget);
            if ($canvas) $canvasId = (int)$canvas['id'];
        }

        $result = $this->canvasServices->updateCanvasRole($userId, (int)$roleId, $canvasId, $name, $permissions, $weight);
        return $this->respond($result);
    }

    public function update_role_permissions($request) {
        if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized')]);
        $userId = $this->session->getActiveAccountId();
        
        $roleId = $request['role_id'] ?? null;
        $canvasTarget = $request['canvas_id'] ?? $request['canvas_uuid'] ?? $request['uuid'] ?? null;
        $permissions = $request['permissions'] ?? [];
        
        if (!$roleId || !$canvasTarget) return $this->respond(['success' => false, 'message' => __('err_missing_required_params')]);
        
        $canvasId = (int)$canvasTarget;
        if (!is_numeric($canvasTarget)) {
            $canvasRepo = new \App\Core\Repositories\CanvasRepository();
            $canvas = $canvasRepo->getByUuid((string)$canvasTarget);
            if ($canvas) $canvasId = (int)$canvas['id'];
        }

        $result = $this->canvasServices->updateCanvasRolePermissions($userId, (int)$roleId, $canvasId, $permissions);
        return $this->respond($result);
    }

    public function delete_role($request) {
        if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized')]);
        $userId = $this->session->getActiveAccountId();
        
        $roleId = $request['role_id'] ?? null;
        $canvasTarget = $request['canvas_id'] ?? $request['canvas_uuid'] ?? $request['uuid'] ?? null;
        
        if (!$roleId || !$canvasTarget) return $this->respond(['success' => false, 'message' => __('err_missing_required_params')]);
        
        $canvasId = (int)$canvasTarget;
        if (!is_numeric($canvasTarget)) {
            $canvasRepo = new \App\Core\Repositories\CanvasRepository();
            $canvas = $canvasRepo->getByUuid((string)$canvasTarget);
            if ($canvas) $canvasId = (int)$canvas['id'];
        }

        $result = $this->canvasServices->deleteCanvasRole($userId, (int)$roleId, $canvasId);
        return $this->respond($result);
    }
}
