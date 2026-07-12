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
        return in_array('access_admin_panel', $perms) || 
               in_array('canvases.manage_official', $perms);
    }

    private function canCreateOfficial(): bool {
        $perms = [];
        if (method_exists($this->session, 'getPermissions')) {
            $perms = $this->session->getPermissions();
        }
        if (!is_array($perms)) {
            $perms = [];
        }
        return in_array('access_admin_panel', $perms) || 
               in_array('canvases.create_official', $perms);
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
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }
            
            $name = $input['name'] ?? '';
            $description = $input['description'] ?? null;
            $privacy = $input['privacy'] ?? 'private';
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


            if ($scopeType === 'global') {
                $scopeRef1 = null; 
                $scopeRef2 = null; 
                $scopeRef3 = null;
            } elseif ($scopeType === 'country' && empty($scopeRef1)) {
                return $this->respond(['success' => false, 'message' => __('err_country_required')]);
            } elseif ($scopeType === 'state' && (empty($scopeRef1) || empty($scopeRef2))) {
                return $this->respond(['success' => false, 'message' => __('err_state_required')]);
            } elseif ($scopeType === 'municipality' && (empty($scopeRef1) || empty($scopeRef2) || empty($scopeRef3))) {
                return $this->respond(['success' => false, 'message' => __('err_city_required')]);
            } elseif ($scopeType === 'organization' && empty($scopeRef1)) {
                return $this->respond(['success' => false, 'message' => __('err_org_required')]);
            }

            $allowPurchases = isset($input['allow_purchases']) ? (int)$input['allow_purchases'] : 1;

            $result = $this->canvasServices->createCanvas(
                $userId, $name, $description, $privacy, $requiresApproval, 
                $size, (int)$limit, $paletteId, (int)$cooldownBatch, (int)$cooldownSeconds,
                $scopeType, $scopeRef1, $scopeRef2, $scopeRef3, $this->canCreateOfficial(),
                $allowPurchases
            );


            if (!$result['success'] && strpos($result['message'] ?? '', 'límite') !== false) {
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
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['id'] ?? null;
            
            if (!$userId || !$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
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
                'allow_purchases' => isset($input['allow_purchases']) ? (int)$input['allow_purchases'] : null
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
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            if ($uuid && is_string($uuid) && empty($input['canvas_ids'])) {
                $result = $this->canvasServices->deleteSingleCanvas($userId, $uuid, $this->canManageOfficial());
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

    public function get_public($input) {
        try {
            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $limit = $input['limit'] ?? 20;
            $sort = $input['sort'] ?? 'newest';

            $result = $this->canvasServices->getPublicCanvases($userId, (int)$limit, $sort);
            
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
            
            $result = $this->canvasServices->getMine($userId, $limit, $filter);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function downgrade($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $userId = $this->session->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => 401]);
            }

            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            if (!$uuid) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }

            $confirmWord = $input['confirm_word'] ?? '';
            if (trim(strtoupper($confirmWord)) !== 'CONFIRMAR') {
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
                return $this->respond(['success' => false, 'message' => __('err_invalid_canvas_id'), 'http_code' => 400]);
            }

            $isLoggedIn = $this->session->isLoggedIn();
            $userId = $isLoggedIn ? $this->session->getActiveAccountId() : null;


            if (!$isLoggedIn) {
                $token = $input['cf-turnstile-response'] ?? $input['turnstile_token'] ?? null;
                
                if (!$token) {
                    return $this->respond(['success' => false, 'message' => __('err_turnstile_required'), 'http_code' => 403]);
                }
                
                $turnstile = new TurnstileValidator();
                $remoteIp = $_SERVER['REMOTE_ADDR'] ?? null;
                
                if (!$turnstile->isValid($token, $remoteIp)) {
                    return $this->respond(['success' => false, 'message' => __('err_bot_detected'), 'http_code' => 403]);
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
                            'http_code' => 429
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
