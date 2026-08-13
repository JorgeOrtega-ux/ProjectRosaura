<?php

namespace App\Api\Services\Support;

use App\Core\Interfaces\SupportRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Helpers\Utils;
use App\Core\System\Logger;

class SupportService {
    private SupportRepositoryInterface $supportRepo;
    private SessionManagerInterface $sessionManager;
    private UserRepositoryInterface $userRepo;

    public const ALLOWED_CATEGORIES = [
        'technical',
        'account',
        'billing',
        'policy',
        'other'
    ];

    public function __construct(
        SupportRepositoryInterface $supportRepo,
        SessionManagerInterface $sessionManager,
        UserRepositoryInterface $userRepo
    ) {
        $this->supportRepo = $supportRepo;
        $this->sessionManager = $sessionManager;
        $this->userRepo = $userRepo;
    }

    public function submitTicket(array $input): array {
        if (!$this->sessionManager->isLoggedIn()) {
            return [
                'success' => false,
                'message' => __('err_support_login_required')
            ];
        }

        $userId = $this->sessionManager->getActiveAccountId();
        if (!$userId) {
            return [
                'success' => false,
                'message' => __('err_support_login_required')
            ];
        }

        $user = $this->userRepo->findById($userId);
        if (!$user) {
            return [
                'success' => false,
                'message' => __('err_user_not_found')
            ];
        }

        $category = trim($input['category'] ?? '');
        $subject = trim($input['subject'] ?? '');
        $message = trim($input['message'] ?? '');

        if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
            $category = 'other';
        }

        if (empty($subject) || mb_strlen($subject) < 4 || mb_strlen($subject) > 200) {
            return [
                'success' => false,
                'message' => __('err_support_invalid_subject')
            ];
        }

        if (empty($message) || mb_strlen($message) < 15 || mb_strlen($message) > 5000) {
            return [
                'success' => false,
                'message' => __('err_support_invalid_message')
            ];
        }

        try {
            $ticketUuid = Utils::generateUuid();
            $ipAddress = Utils::getIpAddress();
            $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

            $this->supportRepo->createTicket([
                'uuid' => $ticketUuid,
                'user_id' => $userId,
                'category' => $category,
                'subject' => $subject,
                'message' => $message,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent
            ]);

            Logger::info("Support ticket created successfully", [
                'ticket_uuid' => $ticketUuid,
                'user_id' => $userId,
                'category' => $category
            ]);

            return [
                'success' => true,
                'message' => __('msg_support_ticket_created', ['uuid' => $ticketUuid]),
                'ticket_uuid' => $ticketUuid
            ];
        } catch (\Throwable $e) {
            Logger::error("Error submitting support ticket: " . $e->getMessage(), [
                'user_id' => $userId,
                'exception' => $e
            ]);

            return [
                'success' => false,
                'message' => __('err_support_submission_failed')
            ];
        }
    }
}
