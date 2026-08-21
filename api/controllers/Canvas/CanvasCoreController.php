<?php

namespace App\Api\Controllers\Canvas;

use App\Api\Controllers\BaseController;

use App\Api\Services\Canvas\CanvasCoreService;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Security\TurnstileValidator;
use App\Config\Database\RedisCache;

class CanvasCoreController extends BaseController {
    private $canvasServices;
    private $session;

    public function __construct(CanvasCoreService $canvasServices, SessionManagerInterface $session) {
        $this->canvasServices = $canvasServices;
        $this->session = $session;
    }




    public function get($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $canvasId = $input['id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id')]);
            }

            $result = $this->canvasServices->getCanvas($userId, (int)$canvasId);
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_chunks($input) {
        try {
            $canvasId = (int)($input['canvas_id'] ?? 0);
            $chunks = $input['chunks'] ?? [];

            $goBaseUrl = rtrim(\App\Core\Helpers\EnvLoader::get('GO_SERVICE_URL', 'http://rosaura_go_service:8080'), '/');
            $goUrl = $goBaseUrl . '/api/go/canvases/get_chunks';
            
            $boardW = isset($input['board_w']) ? (int)$input['board_w'] : 0;
            $boardH = isset($input['board_h']) ? (int)$input['board_h'] : 0;

            if ($canvasId <= 0 || empty($chunks) || !is_array($chunks) || $boardW <= 0 || $boardH <= 0) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_params')]);
            }

            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $accessCheck = $this->canvasServices->validateCanvasAccess($userId, $canvasId);
            if (!$accessCheck['success']) {
                $httpCode = $accessCheck['http_code'] ?? \App\Core\System\HttpConstants::FORBIDDEN;
                return $this->respond(['success' => false, 'message' => $accessCheck['message'], 'http_code' => $httpCode]);
            }

            $payload = json_encode([
                'canvas_id' => $canvasId,
                'board_w' => $boardW,
                'board_h' => $boardH,
                'chunks' => $chunks
            ]);

            header('Content-Type: application/json');
            
            $ch = curl_init($goUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($payload)
            ]);
            
            // Bypass framework respond and stream directly from Go for max performance
            curl_exec($ch);
            curl_close($ch);
            exit;

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

   public function create($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            
            $name = $input['name'] ?? '';
            $privacy = $input['privacy'] ?? \App\Core\System\CanvasConstants::PRIVACY_PRIVATE;
            $requiresApproval = filter_var($input['requires_approval'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $size = $input['size'] ?? '64x64';
            

            $validSizes = array_keys(\App\Core\Helpers\Utils::getCanvasSizes());
            if (!in_array($size, $validSizes)) {
                $size = '64x64';
            }

            $limit = $input['limit'] ?? 10;
            $paletteId = $input['palette_id'] ?? 'default';
            $cooldownBatch = $input['cooldown_pixels_batch'] ?? 5;
            $cooldownSeconds = $input['cooldown_seconds'] ?? 10;

            $allowChat = isset($input['allow_chat']) ? (int)$input['allow_chat'] : 0;
            $tags = isset($input['tags']) && is_array($input['tags']) ? $input['tags'] : [];
            $templateId = $input['template_id'] ?? null;
            if ($templateId === '') {
                $templateId = null;
            }

            if (empty(trim($name))) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_name_required')]);
            }

            $result = $this->canvasServices->createCanvas(
                $userId, $name, $privacy, $requiresApproval, 
                $size, (int)$limit, $paletteId, (int)$cooldownBatch, (int)$cooldownSeconds,
                $allowChat, $tags, $templateId
            );


            if (!$result['success'] && (
                ($result['error_code'] ?? '') === 'LIMIT_EXCEEDED' || 
                ($result['error_code'] ?? '') === 'UPGRADE_REQUIRED' ||
                strpos($result['message'] ?? '', 'lÃƒÂ­mite') !== false
            )) {
                $result['http_code'] = 403;
                $result['error_code'] = 'UPGRADE_REQUIRED';
                http_response_code(403);
            }

            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function update($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            
            if (!$userId || !$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            
            $data = [
                'name' => $input['name'] ?? null,
                'privacy' => $input['privacy'] ?? null,
                'requires_approval' => filter_var($input['requires_approval'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'palette_id' => $input['palette_id'] ?? null,
                'max_participants' => $input['max_members'] ?? null,
                'cooldown_pixels_batch' => $input['cooldown_pixels_batch'] ?? null,
                'cooldown_seconds' => $input['cooldown_seconds'] ?? null,
                'allow_chat' => isset($input['allow_chat']) ? (int)$input['allow_chat'] : null,
                'tags' => isset($input['tags']) && is_array($input['tags']) ? $input['tags'] : []
            ];

            $result = $this->canvasServices->updateCanvas($userId, (int)$canvasId, $data);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $password = $input['password'] ?? '';
            $credential = $input['credential'] ?? $input['google_token'] ?? null;
            if (empty(trim($password)) && empty($credential)) {
                return $this->respond(['success' => false, 'message' => __('err_password_required')]);
            }

            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            if ($uuid && is_string($uuid) && empty($input['canvas_ids'])) {
                $result = $this->canvasServices->deleteCanvas($userId, $uuid, $password, $credential);
                return $this->respond($result);
            }

            $canvasIds = $input['canvas_ids'] ?? [];

            if (empty($canvasIds)) {
                return $this->respond(['success' => false, 'message' => __('err_no_canvases_selected')]);
            }

            $result = $this->canvasServices->deleteUserCanvases($userId, $canvasIds, $password, $credential);
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
    public function get_home_feed($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $limit = isset($input['limit']) ? min(max((int)$input['limit'], 1), 50) : 20;
            $offset = isset($input['offset']) ? max((int)$input['offset'], 0) : 0;
            $tag = $input['tag'] ?? 'all';

            // Whitelist of valid tags - reject anything not in the list
            $validTags = \App\Core\System\CanvasConstants::VALID_TAGS;
            if (!in_array($tag, $validTags, true)) {
                $tag = 'all';
            }

            $result = $this->canvasServices->getHomeFeed($userId, $tag, $limit, $offset);
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_public($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $limit = isset($input['limit']) ? (int)$input['limit'] : 20;
            $sort = $input['sort'] ?? 'newest';
            $offset = isset($input['offset']) ? (int)$input['offset'] : 0;

            $result = $this->canvasServices->getPublicCanvases($userId, $limit, $sort, $offset);
            
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_mine($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $limit = isset($input['limit']) ? (int)$input['limit'] : 50;
            $filter = $input['filter'] ?? 'all';
            $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
            
            $result = $this->canvasServices->getMine($userId, $limit, $filter, $offset);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function downgrade($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            if (!$uuid) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }

            $password = $input['password'] ?? '';
            $credential = $input['credential'] ?? $input['google_token'] ?? null;
            if (empty($password) && empty($credential)) {
                return $this->respond(['success' => false, 'message' => __('err_password_required')]);
            }

            $result = $this->canvasServices->downgradeCanvasToBasic($userId, $uuid, $password, $credential);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_ws_ticket($input) {
        try {
            $canvasId = $input['canvas_id'] ?? $input['id'] ?? null;
            
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id'), 'http_code' => \App\Core\System\HttpConstants::BAD_REQUEST]);
            }

            $isLoggedIn = $this->session->isLoggedIn();
            $userId = $isLoggedIn ? $this->session->getActiveAccountId() : null;


            if (!$isLoggedIn) {
                $token = $input['cf-turnstile-response'] ?? $input['turnstile_token'] ?? null;
                
                if (!$token) {
                    return $this->respond(['success' => false, 'message' => __('err_turnstile_required'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN]);
                }
                
                $turnstile = new TurnstileValidator();
                $remoteIp = $_SERVER['REMOTE_ADDR'] ?? null;
                
                if (!$turnstile->isValid($token, $remoteIp)) {
                    return $this->respond(['success' => false, 'message' => __('err_bot_detected'), 'http_code' => \App\Core\System\HttpConstants::FORBIDDEN]);
                }
            }


            $remoteIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown_ip';
            if (class_exists(RedisCache::class)) {
                $redisInstance = new RedisCache();
                $redis = $redisInstance->getClient();
                if ($redis) {
                    $rateLimitKey = "ws:ticket_ratelimit:{$remoteIp}";
                    $requests = $redis->incr($rateLimitKey);
                    
                    if ($requests == 1) {
                        $redis->expire($rateLimitKey, 60);
                    }
                    
                    if ($requests > 20) {
                        return $this->respond([
                            'success' => false, 
                            'message' => __('err_too_many_tickets'), 
                            'http_code' => \App\Core\System\HttpConstants::TOO_MANY_REQUESTS
                        ]);
                    }
                }
            }



            $result = $this->canvasServices->generateWsTicket($userId, (int)$canvasId);
            
            if (!$result['success']) {
                $code = $result['http_code'] ?? 400;
                http_response_code($code);
            }
            
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function toggleChat($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            $allowChat = isset($input['allow_chat']) ? (int)$input['allow_chat'] : 0;
            
            if (!$userId || !$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $result = $this->canvasServices->updateCanvasChatStatus($userId, (int)$canvasId, $allowChat);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function activate_online($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $canvasId = (int)($input['canvas_id'] ?? $input['id'] ?? 0);
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id')]);
            }
            $result = $this->canvasServices->activateOnline($userId, $canvasId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function deactivate_online($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $canvasId = (int)($input['canvas_id'] ?? $input['id'] ?? 0);
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id')]);
            }
            $result = $this->canvasServices->deactivateOnline($userId, $canvasId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function save_offline_state($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $canvasId = (int)($input['canvas_id'] ?? $input['id'] ?? 0);
            $stateBase64 = $input['state_base64'] ?? '';
            if (!$canvasId || empty($stateBase64)) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_params')]);
            }
            $result = $this->canvasServices->saveOfflineState($userId, $canvasId, $stateBase64);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    // =========================================================================
    // PAPELERA DE RECICLAJE
    // =========================================================================

    public function get_trash($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $limit  = isset($input['limit'])  ? min(max((int)$input['limit'], 1), 100) : 50;
            $offset = isset($input['offset']) ? max((int)$input['offset'], 0) : 0;
            $result = $this->canvasServices->getTrash($userId, $limit, $offset);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function restore($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();

            $canvasIds = $input['canvas_ids'] ?? [];
            if (!empty($canvasIds) && is_array($canvasIds)) {
                $result = $this->canvasServices->restoreUserCanvases($userId, $canvasIds);
                return $this->respond($result);
            }

            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            if (!$uuid) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id')]);
            }
            $result = $this->canvasServices->restoreCanvas($userId, (string)$uuid);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function permanent_delete($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();

            $password = $input['password'] ?? '';
            $credential = $input['credential'] ?? $input['google_token'] ?? null;
            if (empty(trim($password)) && empty($credential)) {
                return $this->respond(['success' => false, 'message' => __('err_password_required')]);
            }

            $uuid      = $input['id'] ?? $input['uuid'] ?? null;
            $canvasIds = $input['canvas_ids'] ?? [];

            if ($uuid && is_string($uuid) && empty($input['canvas_ids'])) {
                $result = $this->canvasServices->permanentDeleteCanvas($userId, $uuid, $password, $credential);
                return $this->respond($result);
            }

            if (empty($canvasIds)) {
                return $this->respond(['success' => false, 'message' => __('err_no_canvases_selected')]);
            }

            $result = $this->canvasServices->permanentDeleteUserCanvases($userId, $canvasIds, $password, $credential);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

}
