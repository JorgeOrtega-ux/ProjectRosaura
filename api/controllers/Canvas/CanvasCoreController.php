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


    private function canManageOfficial(): bool {
        $perms = [];
        if (method_exists($this->session, 'getPermissions')) {
            $perms = $this->session->getPermissions();
        }
        if (!is_array($perms)) {
            $perms = [];
        }
        return in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $perms) || 
               in_array(\App\Core\System\PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $perms) ||
               in_array(\App\Core\System\PermissionsConstants::CANVASES_CREATE_OFFICIAL, $perms);
    }

    private function canCreateOfficial(): bool {
        $perms = [];
        if (method_exists($this->session, 'getPermissions')) {
            $perms = $this->session->getPermissions();
        }
        if (!is_array($perms)) {
            $perms = [];
        }
        return in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $perms) || 
               in_array(\App\Core\System\PermissionsConstants::CANVASES_CREATE_OFFICIAL, $perms);
    }

    public function get($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $canvasId = $input['id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id')]);
            }

            $result = $this->canvasServices->getCanvas($userId, (int)$canvasId, $this->canManageOfficial());
            
            return $this->respond($result);

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
            $description = $input['description'] ?? null;
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


            $scopeType = $input['scope_type'] ?? 'personal';
            $scopeRef1 = $input['scope_ref_1'] ?? null;
            $scopeRef2 = $input['scope_ref_2'] ?? null;
            $scopeRef3 = $input['scope_ref_3'] ?? null;

            if (empty(trim($name))) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_name_required')]);
            }


            if ($scopeType === \App\Core\System\CanvasConstants::SCOPE_GLOBAL) {
                $scopeRef1 = null; 
                $scopeRef2 = null; 
                $scopeRef3 = null;
            } elseif ($scopeType === \App\Core\System\CanvasConstants::SCOPE_COUNTRY && empty($scopeRef1)) {
                return $this->respond(['success' => false, 'message' => __('err_country_required')]);
            } elseif ($scopeType === \App\Core\System\CanvasConstants::SCOPE_STATE && (empty($scopeRef1) || empty($scopeRef2))) {
                return $this->respond(['success' => false, 'message' => __('err_state_required')]);
            } elseif ($scopeType === \App\Core\System\CanvasConstants::SCOPE_MUNICIPALITY && (empty($scopeRef1) || empty($scopeRef2) || empty($scopeRef3))) {
                return $this->respond(['success' => false, 'message' => __('err_city_required')]);
            } elseif ($scopeType === \App\Core\System\CanvasConstants::SCOPE_ORGANIZATION && empty($scopeRef1)) {
                return $this->respond(['success' => false, 'message' => __('err_org_required')]);
            }

            $allowPurchases = isset($input['allow_purchases']) ? (int)$input['allow_purchases'] : 1;
            $allowChat = isset($input['allow_chat']) ? (int)$input['allow_chat'] : 0;
            $tags = isset($input['tags']) && is_array($input['tags']) ? $input['tags'] : [];

            $result = $this->canvasServices->createCanvas(
                $userId, $name, $description, $privacy, $requiresApproval, 
                $size, (int)$limit, $paletteId, (int)$cooldownBatch, (int)$cooldownSeconds,
                $scopeType, $scopeRef1, $scopeRef2, $scopeRef3, $this->canCreateOfficial(),
                $allowPurchases, $allowChat, $tags
            );


            if (!$result['success'] && strpos($result['message'] ?? '', 'lÃƒÂ­mite') !== false) {
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
                'description' => $input['description'] ?? null,
                'privacy' => $input['privacy'] ?? null,
                'requires_approval' => filter_var($input['requires_approval'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'palette_id' => $input['palette_id'] ?? null,
                'max_participants' => $input['max_members'] ?? null,
                'cooldown_pixels_batch' => $input['cooldown_pixels_batch'] ?? null,
                'cooldown_seconds' => $input['cooldown_seconds'] ?? null,
                'allow_purchases' => isset($input['allow_purchases']) ? (int)$input['allow_purchases'] : null,
                'allow_chat' => isset($input['allow_chat']) ? (int)$input['allow_chat'] : null,
                'tags' => isset($input['tags']) && is_array($input['tags']) ? $input['tags'] : []
            ];

            $result = $this->canvasServices->updateCanvas($userId, (int)$canvasId, $data, $this->canManageOfficial());
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

            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            if ($uuid && is_string($uuid) && empty($input['canvas_ids'])) {
                $result = $this->canvasServices->deleteCanvas($userId, $uuid, $this->canManageOfficial());
                return $this->respond($result);
            }

            $canvasIds = $input['canvas_ids'] ?? [];
            $password = $input['password'] ?? '';

            if (empty($canvasIds)) {
                return $this->respond(['success' => false, 'message' => __('err_no_canvases_selected')]);
            }

            if (empty(trim($password))) {
                return $this->respond(['success' => false, 'message' => __('err_password_required')]);
            }

            $result = $this->canvasServices->deleteUserCanvases($userId, $canvasIds, $password);
            
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

            $result = $this->canvasServices->getHomeFeed($userId, $tag, $limit, $offset, $this->canManageOfficial());
            
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

            $result = $this->canvasServices->getPublicCanvases($userId, $limit, $sort, $offset, $this->canManageOfficial());
            
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

    public function get_official($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $limit = isset($input['limit']) ? (int)$input['limit'] : 50;
            $sort = $input['sort'] ?? 'newest';
            $offset = isset($input['offset']) ? (int)$input['offset'] : 0;
            
            $result = $this->canvasServices->getOfficialCanvases($userId, $limit, $sort, $offset, $this->canManageOfficial());
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

            $confirmWord = $input['confirm_word'] ?? '';
            if (trim(strtoupper($confirmWord)) !== 'CONFIRM') {
                return $this->respond(['success' => false, 'message' => __('err_confirm_word_required')]);
            }

            $result = $this->canvasServices->downgradeCanvasToBasic($userId, $uuid, $this->canManageOfficial());
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
}
