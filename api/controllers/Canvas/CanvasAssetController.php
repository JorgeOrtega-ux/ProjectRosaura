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


        return in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $perms) || 
               in_array(\App\Core\System\PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $perms);
    }

    public function upload_template($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
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
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
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
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
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
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
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
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
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
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
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

    public function inject_template($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $dbManager = new \App\Config\Database\DatabaseManager();
            $pdoIdentity = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
            $stmtUser = $pdoIdentity->prepare("SELECT subscription_tier FROM users WHERE id = :id LIMIT 1");
            $stmtUser->execute([':id' => $userId]);
            $tier = (int)($stmtUser->fetchColumn() ?: 0);

            $perms = $this->session->getPermissions();
            if (empty($perms) && isset($_SESSION['user_permissions'])) {
                $perms = $_SESSION['user_permissions'];
            } elseif (empty($perms) && isset($_SESSION['permissions'])) {
                $perms = $_SESSION['permissions'];
            }
            if (!is_array($perms)) {
                $perms = [];
            }
            
            $canInject = ($tier >= 3) ||
                         in_array(\App\Core\System\PermissionsConstants::INJECT_TEMPLATE, $perms) || 
                         in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $perms);
            
            if (!$canInject) {
                return $this->respond(['success' => false, 'message' => 'Esta función requiere una suscripción Ultra (Nivel 3).']);
            }

            // --- TOKEN LIMIT CHECK (5 Hours Window) ---
            $planLimits = \App\Core\System\SubscriptionPlanConstants::getTierLimits($tier);
            $maxTokens = (int)($planLimits['max_template_tokens'] ?? 5000);
            if ($maxTokens <= 0 && $tier < 3) {
                return $this->respond(['success' => false, 'message' => 'Tu plan actual no incluye cuota de tokens para inyección de plantillas.']);
            }
            if ($maxTokens <= 0) {
                $maxTokens = 5000;
            }

            $w = (int)($input['w'] ?? 500);
            $h = (int)($input['h'] ?? 500);
            // Dynamic token cost based on dimension or minimum base cost of 500 tokens
            $tokensCost = max(500, min(2500, (int)round(($w * $h) / 2000)));

            $stmtUsage = $pdoIdentity->prepare("SELECT template_tokens_used, template_tokens_reset_at FROM users WHERE id = :id LIMIT 1");
            $stmtUsage->execute([':id' => $userId]);
            $userRow = $stmtUsage->fetch(\PDO::FETCH_ASSOC) ?: [];

            $usedTokens = (int)($userRow['template_tokens_used'] ?? 0);
            $resetAt = $userRow['template_tokens_reset_at'] ?? null;

            if ($resetAt && strtotime($resetAt) <= time()) {
                $usedTokens = 0;
                $resetAt = null;
            }

            if (($usedTokens + $tokensCost) > $maxTokens) {
                $resetInSecs = $resetAt ? max(0, strtotime($resetAt) - time()) : 0;
                $hoursLeft = ceil($resetInSecs / 3600);
                return $this->respond([
                    'success' => false,
                    'message' => "Límite de tokens alcanzado ({$usedTokens}/{$maxTokens} tokens consumidos). Se restablecerá en aproximadamente {$hoursLeft} hora(s)."
                ]);
            }

            // Initialize 5-hour window on first consumption
            if (!$resetAt) {
                $resetAt = date('Y-m-d H:i:s', strtotime('+5 hours'));
            }

            $newUsedTokens = $usedTokens + $tokensCost;
            $stmtDeduct = $pdoIdentity->prepare("UPDATE users SET template_tokens_used = ?, template_tokens_reset_at = ? WHERE id = ?");
            $stmtDeduct->execute([$newUsedTokens, $resetAt, $userId]);
            // --- END TOKEN LIMIT CHECK ---

            $canvasUuid = $input['canvas_id'] ?? null;
            $url = $input['url'] ?? null;
            $x = $input['x'] ?? 0;
            $y = $input['y'] ?? 0;
            
            if (!$canvasUuid || !$url) {
                return $this->respond(['success' => false, 'message' => __('err_missing_required_params')]);
            }

            $dbManager = new \App\Config\Database\DatabaseManager();
            $pdo = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
            $stmt = $pdo->prepare("SELECT id FROM canvases WHERE uuid = :uuid");
            $stmt->execute(['uuid' => $canvasUuid]);
            $canvasId = $stmt->fetchColumn();

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => 'Lienzo no encontrado.']);
            }

            $redis = (new \App\Config\Database\RedisCache())->getClient();
            $taskData = [
                'canvas_id' => (int)$canvasId,
                'url' => $url,
                'x' => (int)$x,
                'y' => (int)$y,
                'w' => (int)($input['w'] ?? 0),
                'h' => (int)($input['h'] ?? 0),
                'angle' => (float)($input['angle'] ?? 0),
                'timestamp' => time()
            ];
            $redis->rpush('queue:canvas_draw_image', json_encode($taskData));
            
            return $this->respond(['success' => true, 'message' => 'Imagen encolada correctamente. Por favor espera unos segundos.']);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
