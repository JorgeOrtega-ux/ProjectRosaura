<?php

namespace App\Api\Controllers\Canvas;

use App\Api\Controllers\BaseController;

use App\Api\Services\Canvas\CanvasAccessService;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Security\TurnstileValidator;
use App\Config\Database\RedisCache;

class CanvasAccessController extends BaseController {
    private $canvasServices;
    private $session;

    public function __construct(CanvasAccessService $canvasServices, SessionManagerInterface $session) {
        $this->canvasServices = $canvasServices;
        $this->session = $session;
    }




    public function join_live_share($input) {
        try {
            $code = $input['code'] ?? $input['id'] ?? null;

            $canvasId = $input['canvas_id'] ?? null;

            if (!$code) {
                $uriParts = explode('/', trim($_SERVER['REQUEST_URI'] ?? '', '/'));
                $code = end($uriParts);
            }

            if (!$code || strlen($code) < 5) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_session_code')]);
            }


            $userId = $this->session->isLoggedIn() ? $this->session->getActiveAccountId() : null;
            $result = $this->canvasServices->joinLiveShare(strtoupper($code), (int)$canvasId, $userId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function leave($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $userId = $this->session->getActiveAccountId();
            $uuid = $input['id'] ?? $input['uuid'] ?? null;
            
            if (!$uuid) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }

            $result = $this->canvasServices->leaveCanvas($userId, $uuid);
            return $this->respond($result);

        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function request_access($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['canvas_id'] ?? null;
            $termsAccepted = filter_var($input['terms_accepted'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if (!$canvasId) return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            if (!$termsAccepted) return $this->respond(['success' => false, 'message' => __('err_accept_rules_required')]);
            
            return $this->respond($this->canvasServices->requestAccess($userId, (int)$canvasId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function approve_request($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            $userId = $this->session->getActiveAccountId();
            $requestId = $input['request_id'] ?? null;
            if (!$requestId) return $this->respond(['success' => false, 'message' => __('err_request_not_provided')]);
            
            return $this->respond($this->canvasServices->approveRequest($userId, (int)$requestId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function reject_request($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            $userId = $this->session->getActiveAccountId();
            $requestId = $input['request_id'] ?? null;
            if (!$requestId) return $this->respond(['success' => false, 'message' => __('err_request_not_provided')]);
            
            return $this->respond($this->canvasServices->rejectRequest($userId, (int)$requestId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_pending_requests($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['canvas_id'] ?? null;
            if (!$canvasId) return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            
            return $this->respond($this->canvasServices->getPendingRequests($userId, (int)$canvasId));
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_member_role_data($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            $canvasUuid = $input['canvas_uuid'] ?? null;
            $targetUserUuid = $input['target_user_uuid'] ?? null;
            $canvasViewService = new \App\Api\Services\Canvas\CanvasViewService();
            $data = $canvasViewService->getCanvasChangeRoleData($canvasUuid, $targetUserUuid);
            return $this->respond(['success' => true, 'data' => $data]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function assign_member_role($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            $userId = $this->session->getActiveAccountId();
            
            $canvasId = $input['canvas_id'] ?? null;
            $targetUserId = $input['target_user_id'] ?? null;
            $roles = $input['roles'] ?? [];
            if (!is_array($roles) && isset($input['role'])) {
                $roles = [$input['role']];
            }

            if (!$canvasId || !$targetUserId || empty($roles)) {
                return $this->respond(['success' => false, 'message' => __('err_incomplete_role_data')]);
            }

            $result = $this->canvasServices->assignMemberRoles($userId, (int)$canvasId, (int)$targetUserId, $roles);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function remove_member($input) {
        try {
            if (!$this->session->isLoggedIn()) return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            $userId = $this->session->getActiveAccountId();
            
            $canvasId = $input['canvas_id'] ?? null;
            $targetUserId = $input['target_user_id'] ?? null;

            if (!$canvasId || !$targetUserId) {
                return $this->respond(['success' => false, 'message' => __('err_incomplete_kick_data')]);
            }

            $result = $this->canvasServices->removeMember($userId, (int)$canvasId, (int)$targetUserId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function create_live_share($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            
            $canvasId = $input['canvas_id'] ?? null;
            $imgUrl = $input['img_url'] ?? null;
            $x = $input['x'] ?? 0;
            $y = $input['y'] ?? 0;
            $w = $input['w'] ?? 100;
            $h = $input['h'] ?? 100;
            $opacity = $input['opacity'] ?? 1;
            $angle = $input['angle'] ?? 0;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_missing_live_share_params')]);
            }

            $result = $this->canvasServices->createLiveShare($userId, (int)$canvasId, $imgUrl, (float)$x, (float)$y, (float)$w, (float)$h, (float)$opacity, (float)$angle);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function stop_live_share($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $canvasId = $input['canvas_id'] ?? null;

            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_missing_live_share_params')]);
            }

            $result = $this->canvasServices->stopLiveShare($userId, (int)$canvasId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function generate_invite($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();

            $canvasId = $input['canvas_id'] ?? null;
            $role = $input['role'] ?? null;
            $expiresAt = $input['expires_at'] ?? null;

            if (!$canvasId || !$role) {
                return $this->respond(['success' => false, 'message' => __('err_incomplete_invite_data')]);
            }

            // Sanitize max_uses: must be a positive integer or null
            $maxUses = $input['max_uses'] ?? null;
            if ($maxUses !== null && $maxUses !== '') {
                $maxUses = (int)$maxUses;
                if ($maxUses < 1) {
                    $maxUses = null;
                } elseif ($maxUses > 999) {
                    $maxUses = 999;
                }
            } else {
                $maxUses = null;
            }

            $result = $this->canvasServices->generateInvite($userId, (int)$canvasId, $role, $maxUses, $expiresAt);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function list_invites($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();

            $canvasId = $input['canvas_id'] ?? null;
            if (!$canvasId) {
                return $this->respond(['success' => false, 'message' => __('err_canvas_not_provided')]);
            }

            $result = $this->canvasServices->listInvites($userId, (int)$canvasId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function revoke_invite($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();

            $canvasId = $input['canvas_id'] ?? null;
            $inviteId = $input['invite_id'] ?? null;

            if (!$canvasId || !$inviteId) {
                return $this->respond(['success' => false, 'message' => __('err_incomplete_revoke_data')]);
            }

            $result = $this->canvasServices->revokeInvite($userId, (int)$canvasId, (int)$inviteId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function join_via_invite($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();

            $code = trim($input['code'] ?? '');
            if (empty($code) || strlen($code) < 5) {
                return $this->respond(['success' => false, 'message' => __('err_invalid_invite_code')]);
            }

            $termsAccepted = filter_var($input['terms_accepted'] ?? false, FILTER_VALIDATE_BOOLEAN);
            if (!$termsAccepted) {
                return $this->respond(['success' => false, 'message' => __('err_accept_rules_required')]);
            }

            $result = $this->canvasServices->joinViaInvite($userId, strtoupper($code));
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
