<?php

namespace App\Api\Controllers\User;

use App\Api\Controllers\BaseController;
use App\Api\Services\User\UserProfileViewService;

class UserController extends BaseController {
    private UserProfileViewService $profileViewService;

    public function __construct(UserProfileViewService $profileViewService) {
        $this->profileViewService = $profileViewService;
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
}
