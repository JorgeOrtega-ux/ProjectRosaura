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
    private $userRepo;

    public function __construct(CanvasAssetService $canvasServices, SessionManagerInterface $session, \App\Core\Interfaces\UserRepositoryInterface $userRepo) {
        $this->canvasServices = $canvasServices;
        $this->session = $session;
        $this->userRepo = $userRepo;
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

    public function list_templates($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $result = $this->canvasServices->listTemplates($userId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_templates($input) {
        return $this->list_templates($input);
    }

    public function delete_template($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            
            $userId = $this->session->getActiveAccountId();
            $templateId = $input['id'] ?? null;
            
            if (!$templateId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_template_id')]);
            }

            $result = $this->canvasServices->deleteTemplate($userId, (int)$templateId);
            return $this->respond($result);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_template_pixel_data($input) {
        try {
            $id = (int)($input['id'] ?? 0);
            if ($id <= 0) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_id')]);
            }
            $result = $this->canvasServices->getTemplatePixelData($id);
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
            
            $canInject = \App\Core\System\SubscriptionPlanConstants::hasFeature($tier, 'inject_templates');
            
            if (!$canInject) {
                return $this->respond(['success' => false, 'message' => __('err_requires_inject_templates_plan')]);
            }

            $canvasUuid = $input['canvas_id'] ?? null;
            $url = $input['url'] ?? null;
            $x = $input['x'] ?? 0;
            $y = $input['y'] ?? 0;
            
            if (!$canvasUuid || !$url) {
                return $this->respond(['success' => false, 'message' => __('err_missing_required_params')]);
            }

            $dbManager = new \App\Config\Database\DatabaseManager();
            $pdo = $dbManager->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);
            $stmt = $pdo->prepare("SELECT id, owner_id, privacy, is_subscription_locked FROM canvases WHERE uuid = :uuid LIMIT 1");
            $stmt->execute(['uuid' => $canvasUuid]);
            $canvas = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$canvas) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_found'), 'http_code' => \App\Core\System\HttpConstants::NOT_FOUND]);
            }

            $canvasId = (int)$canvas['id'];

            if (!empty($canvas['is_subscription_locked'])) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_locked'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN]);
            }

            $isOwner = ((int)$canvas['owner_id'] === (int)$userId);

            if (!$isOwner) {
                // Check if user is banned from canvas
                $stmtBan = $pdo->prepare("SELECT id FROM canvas_sanctions WHERE canvas_id = ? AND user_id = ? AND sanction_scope IN ('canvas_ban', 'pixel_ban') AND (suspension_type = 'permanent' OR (suspension_type = 'temporary' AND end_date > NOW())) LIMIT 1");
                $stmtBan->execute([$canvasId, $userId]);
                if ($stmtBan->fetch()) {
                    return $this->respond(['success' => false, 'message' => __('err_chat_restricted'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN]);
                }

                // Check canvas role permissions for place_pixels
                $stmtPerm = $pdo->prepare("SELECT 1 FROM canvas_user_roles cur JOIN canvas_role_permissions crp ON cur.role_id = crp.role_id JOIN canvas_permissions cp ON crp.permission_id = cp.id WHERE cur.canvas_id = ? AND cur.user_id = ? AND cp.name = 'place_pixels' LIMIT 1");
                $stmtPerm->execute([$canvasId, $userId]);
                $hasPlacePixelPerm = (bool)$stmtPerm->fetchColumn();

                if ($canvas['privacy'] === \App\Core\System\DatabaseConstants::PRIVACY_PRIVATE && !$hasPlacePixelPerm) {
                    return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN]);
                }
            }

            // --- TOKEN LIMIT CHECK (5 Hours Window) ---
            $planLimits = \App\Core\System\SubscriptionPlanConstants::getTierLimits($tier);
            $maxTokens = (int)($planLimits['max_template_tokens'] ?? 0);
            if ($maxTokens <= 0) {
                return $this->respond(['success' => false, 'message' => __('err_plan_no_template_tokens')]);
            }

            $w = (int)($input['w'] ?? 500);
            $h = (int)($input['h'] ?? 500);
            // Dynamic token cost based on dimension or minimum base cost of 25 tokens
            $tokensCost = max(25, min(2500, (int)round(($w * $h) / 1000)));

            $usage = $this->userRepo->getTemplateTokenUsage($userId);
            $usedTokens = (int)($usage['used'] ?? 0);
            $resetAt = $usage['reset_at'] ?? null;

            if (($usedTokens + $tokensCost) > $maxTokens) {
                return $this->respond([
                    'success' => false,
                    'message' => __('err_template_tokens_limit_exceeded')
                ]);
            }

            $this->userRepo->consumeTemplateTokens($userId, $tokensCost);
            // --- END TOKEN LIMIT CHECK ---

            $redis = (new \App\Config\Database\RedisCache())->getClient();
            $taskData = [
                'canvas_id' => (int)$canvasId,
                'user_id' => (int)$userId,
                'url' => $url,
                'x' => (int)$x,
                'y' => (int)$y,
                'w' => (int)($input['w'] ?? 0),
                'h' => (int)($input['h'] ?? 0),
                'angle' => (float)($input['angle'] ?? 0),
                'timestamp' => time()
            ];
            $redis->rpush('queue:canvas_draw_image', json_encode($taskData));
            
            return $this->respond(['success' => true, 'message' => __('msg_template_queued')]);
            
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_template_tokens($input) {
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

            $planLimits = \App\Core\System\SubscriptionPlanConstants::getTierLimits($tier);
            $maxTokens = (int)($planLimits['max_template_tokens'] ?? 0);

            $usage = $this->userRepo->getTemplateTokenUsage($userId);
            $usedTokens = (int)($usage['used'] ?? 0);
            $remainingTokens = max(0, $maxTokens - $usedTokens);

            return $this->respond([
                'success' => true,
                'tokens' => [
                    'used_tokens' => $usedTokens,
                    'max_tokens' => $maxTokens,
                    'remaining_tokens' => $remainingTokens,
                    'reset_at' => $usage['reset_at'],
                    'reset_in_seconds' => $usage['reset_in_seconds'],
                    'has_feature' => ($maxTokens > 0)
                ]
            ]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
