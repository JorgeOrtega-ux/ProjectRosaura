<?php
namespace App\Api\Controllers\App;

use App\Api\Controllers\BaseController;
use App\Api\Services\App\TrashService;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\System\HttpConstants;

class TrashController extends BaseController {

    private $trashService;
    private $session;

    public function __construct(TrashService $trashService, SessionManagerInterface $session) {
        $this->trashService = $trashService;
        $this->session = $session;
    }

    public function get_items($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $result = $this->trashService->getTrashItems($userId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function restore_item($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $type = $input['type'] ?? '';
            $id   = $input['id']   ?? '';
            if (empty($type) || empty($id)) {
                return $this->respond(['success' => false, 'message' => __('err_missing_parameters')]);
            }
            $result = $this->trashService->restoreItem($userId, $type, $id);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete_permanently($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $type = $input['type'] ?? '';
            $id   = $input['id']   ?? '';
            if (empty($type) || empty($id)) {
                return $this->respond(['success' => false, 'message' => __('err_missing_parameters')]);
            }
            $result = $this->trashService->deletePermanently($userId, $type, $id);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function empty_trash($input) {
        try {
            if (!$this->session->isLoggedIn()) {
                return $this->respond(['success' => false, 'message' => __('err_auth_required'), 'http_code' => HttpConstants::UNAUTHORIZED]);
            }
            $userId = $this->session->getActiveAccountId();
            $result = $this->trashService->emptyUserTrash($userId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }
}
