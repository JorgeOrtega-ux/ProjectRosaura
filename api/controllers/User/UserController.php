<?php

namespace App\Api\Controllers\User;

use App\Api\Controllers\BaseController;
use App\Api\Services\User\UserProfileViewService;
use App\Core\Interfaces\FollowRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;

class UserController extends BaseController {
    private UserProfileViewService $profileViewService;
    private FollowRepositoryInterface $followRepository;
    private UserRepositoryInterface $userRepository;
    private SessionManagerInterface $sessionManager;

    public function __construct(
        UserProfileViewService $profileViewService,
        FollowRepositoryInterface $followRepository,
        UserRepositoryInterface $userRepository,
        SessionManagerInterface $sessionManager
    ) {
        $this->profileViewService = $profileViewService;
        $this->followRepository = $followRepository;
        $this->userRepository = $userRepository;
        $this->sessionManager = $sessionManager;
    }

    public function get_profile_data($input) {
        try {
            $identifier = $input['identifier'] ?? ($input['username'] ?? '');
            $data = $this->profileViewService->getProfileData($identifier);
            if (!$data) {
                return $this->respond(['success' => false, 'message' => __('error.user_not_found')]);
            }
            return $this->respond(['success' => true, 'data' => $data]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function toggle_follow($input) {
        try {
            if (!$this->sessionManager->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('error.unauthorized')]);
            }

            $activeUserId = (int)$this->sessionManager->getActiveAccountId();
            if ($activeUserId <= 0) {
                return $this->respond(['success' => false, 'message' => __('error.unauthorized')]);
            }

            $targetUserId = (int)($input['user_id'] ?? 0);
            if ($targetUserId <= 0 && !empty($input['identifier'])) {
                $targetUser = $this->userRepository->findByIdentifier(ltrim(trim($input['identifier']), '@'));
                if (!$targetUser) {
                    $targetUser = $this->userRepository->findByUsername(ltrim(trim($input['identifier']), '@'));
                }
                if ($targetUser) {
                    $targetUserId = (int)$targetUser['id'];
                }
            }

            if ($targetUserId <= 0) {
                return $this->respond(['success' => false, 'message' => __('error.invalid_parameters')]);
            }

            $res = $this->followRepository->toggleFollow($activeUserId, $targetUserId);
            return $this->respond($res);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_followers($input) {
        try {
            $identifier = $input['identifier'] ?? ($input['username'] ?? '');
            $page = max(1, (int)($input['page'] ?? 1));
            $limit = min(50, max(1, (int)($input['limit'] ?? 20)));

            $res = $this->profileViewService->getFollowers($identifier, $page, $limit);
            if (!$res) {
                return $this->respond(['success' => false, 'message' => __('error.user_not_found')]);
            }

            return $this->respond([
                'success' => true,
                'data' => $res['users'],
                'total' => $res['total'],
                'page' => $res['page'],
                'per_page' => $res['per_page'],
                'has_more' => $res['has_more']
            ]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function get_following($input) {
        try {
            $identifier = $input['identifier'] ?? ($input['username'] ?? '');
            $page = max(1, (int)($input['page'] ?? 1));
            $limit = min(50, max(1, (int)($input['limit'] ?? 20)));

            $res = $this->profileViewService->getFollowing($identifier, $page, $limit);
            if (!$res) {
                return $this->respond(['success' => false, 'message' => __('error.user_not_found')]);
            }

            return $this->respond([
                'success' => true,
                'data' => $res['users'],
                'total' => $res['total'],
                'page' => $res['page'],
                'per_page' => $res['per_page'],
                'has_more' => $res['has_more']
            ]);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
?>