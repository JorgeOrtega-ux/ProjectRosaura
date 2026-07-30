<?php
namespace App\Api\Controllers\Chat;

use App\Api\Controllers\BaseController;
use App\Api\Services\Chat\ChatServices;
use App\Core\Interfaces\SessionManagerInterface;

class ChatController extends BaseController
{
    private $sessionManager;
    private $chatServices;

    public function __construct(SessionManagerInterface $sessionManager, ChatServices $chatServices = null)
    {
        $this->sessionManager = $sessionManager;
        $this->chatServices = $chatServices ?? new ChatServices();
    }

    public function history($request)
    {
        try {
            $canvasId = $request['canvas_id'] ?? 0;
            if (!is_numeric($canvasId) && !empty($canvasId)) {
                $canvasId = $this->chatServices->resolveCanvasIntId($canvasId);
            } else {
                $canvasId = (int)$canvasId;
            }
            $offset = (int)($request['offset'] ?? 0);
            
            $userId = $this->sessionManager->getActiveAccountId();
            
            $result = $this->chatServices->history($userId, $canvasId, $offset);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function send($request)
    {
        try {
            $userId = $this->sessionManager->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $canvasId = $request['canvas_id'] ?? 0;
            if (!is_numeric($canvasId) && !empty($canvasId)) {
                $canvasId = $this->chatServices->resolveCanvasIntId($canvasId);
            } else {
                $canvasId = (int)$canvasId;
            }
            $messageText = trim((string)($request['message'] ?? ''));
            $clientId = trim((string)($request['client_id'] ?? ''));
            $replyTo = !empty($request['reply_to']) ? trim((string)$request['reply_to']) : null;
            $files = $request['_files']['images'] ?? null;

            $result = $this->chatServices->send($userId, $canvasId, $messageText, $files, $clientId, $replyTo);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function delete($request)
    {
        try {
            $userId = $this->sessionManager->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $messageId = $request['message_id'] ?? 0;
            $canvasId = $request['canvas_id'] ?? 0;
            if (!is_numeric($canvasId) && !empty($canvasId)) {
                $canvasId = $this->chatServices->resolveCanvasIntId($canvasId);
            } else {
                $canvasId = (int)$canvasId;
            }

            $result = $this->chatServices->delete($userId, $canvasId, $messageId);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function report($request)
    {
        try {
            $userId = $this->sessionManager->getActiveAccountId();
            if (!$userId) {
                return $this->respond(['success' => false, 'message' => __('err_unauthorized'), 'http_code' => \App\Core\System\HttpConstants::UNAUTHORIZED]);
            }

            $messageId = $request['message_id'] ?? 0;
            $reason = trim((string)($request['reason'] ?? ''));
            $details = trim((string)($request['details'] ?? ''));

            $result = $this->chatServices->report($userId, $messageId, $reason, $details);
            return $this->respond($result);
        } catch (\Throwable $e) {
            return $this->handleException($e, __FUNCTION__);
        }
    }

    public function attachment($request)
    {
        try {
            $userId = $this->sessionManager->getActiveAccountId();
            $canvasUuid = $request['canvas_uuid'] ?? '';
            $file = basename($request['file'] ?? '');

            $userPermissions = [];
            if (method_exists($this->sessionManager, 'getPermissions')) {
                $userPermissions = $this->sessionManager->getPermissions();
            } elseif (isset($_SESSION['user_permissions'])) {
                $userPermissions = $_SESSION['user_permissions'];
            }

            $result = $this->chatServices->getAttachmentAccess($userId, $canvasUuid, $file, $userPermissions);

            if (!$result['success']) {
                $code = $result['http_code'] ?? 400;
                http_response_code($code);
                exit;
            }

            while (ob_get_level()) {
                ob_end_clean();
            }
            
            header('Location: ' . $result['presigned_url']);
            exit;
        } catch (\Throwable $e) {
            $this->handleException($e, __FUNCTION__);
            http_response_code(500);
            exit;
        }
    }
}
