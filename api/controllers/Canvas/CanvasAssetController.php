<?php

namespace App\Api\Controllers\Canvas;

use App\Api\Controllers\BaseController;

use App\Api\Services\Canvas\CanvasAssetService;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Security\TurnstileValidator;
use App\Config\Database\RedisCache;

class CanvasAssetController extends BaseController {
    private $canvasServices;
    private $session;

    public function __construct(CanvasAssetService $canvasServices, SessionManagerInterface $session) {
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

    public function upload_template($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            
            if (!isset($_FILES['file'])) {
                return $this->respond(['success' => false, 'message' => __('err_no_file_uploaded')]);
            }

            $result = $this->canvasServices->uploadTemplate($userId, $_FILES['file']);
            return $this->respond($result);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_templates($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $result = $this->canvasServices->getUserTemplates($userId);
            
            return $this->respond($result);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete_template($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $templateId = $input['id'] ?? null;
            
            if (!$templateId) {
                return $this->respond(['success' => false, 'message' => __('err_template_id_missing')]);
            }

            $result = $this->canvasServices->deleteTemplate($userId, (int)$templateId);
            return $this->respond($result);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
    public function get_custom_palettes($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            $userId = $this->session->getActiveAccountId();
            $result = $this->canvasServices->getCustomPalettes($userId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function create_custom_palette($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            $userId = $this->session->getActiveAccountId();
            
            $name = $input['name'] ?? null;
            $colors = $input['colors'] ?? null;

            if (empty(trim($name)) || !is_array($colors) || count($colors) < 4) {
                return $this->respond(['success' => false, 'message' => __('err_palette_incomplete')]);
            }

            $result = $this->canvasServices->createCustomPalette($userId, trim($name), $colors);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete_custom_palette($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            $userId = $this->session->getActiveAccountId();
            $paletteId = $input['id'] ?? $input['palette_key'] ?? null;

            if (!$paletteId) {
                return $this->respond(['success' => false, 'message' => __('err_palette_id_missing')]);
            }

            $result = $this->canvasServices->deleteCustomPalette($userId, $paletteId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function toggle_favorite($request) {
        if (!$this->session->isLoggedIn()) return ['success' => false, 'message' => __('err_unauthorized')];
        $userId = $this->session->getActiveAccountId();
        
        $canvasId = $request['canvas_id'] ?? $request['id'] ?? null;
        if (!$canvasId) return ['success' => false, 'message' => __('err_missing_required_params')];
        
        $result = $this->canvasServices->toggleFavorite($userId, (int)$canvasId);
        return $result;
    }
}
