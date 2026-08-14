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

            try {
                if (!empty($user['email'])) {
                    $mailer = new \App\Core\Mail\Mailer();
                    $mailer->sendSupportTicketCreated(
                        $user['email'],
                        $user['username'] ?? 'User',
                        $ticketUuid,
                        $subject,
                        $category
                    );
                }
            } catch (\Throwable $mailEx) {
                Logger::warning("Could not send support ticket creation confirmation email", [
                    'ticket_uuid' => $ticketUuid,
                    'email' => $user['email'] ?? null,
                    'exception' => $mailEx
                ]);
            }

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

    public function getQueueStatus(array $input): array {
        $sessionUuid = trim($input['session_uuid'] ?? '');
        $availableAgents = $this->supportRepo->getAvailableAgentsCount('all');

        $activeSession = null;
        $queuePosition = 0;

        if ($this->sessionManager->isLoggedIn()) {
            $userId = $this->sessionManager->getActiveAccountId();
            if ($userId) {
                $activeSession = $this->supportRepo->getActiveSessionForUser($userId);
            }
        }

        if (!$activeSession && !empty($sessionUuid)) {
            $activeSession = $this->supportRepo->findSessionByUuid($sessionUuid);
        }

        if ($activeSession && in_array($activeSession['status'], ['waiting_in_queue', 'escalated'], true)) {
            $queuePosition = $this->supportRepo->getQueuePosition($activeSession['uuid'], $activeSession['department_level']);
        }

        return [
            'success' => true,
            'available_agents' => $availableAgents,
            'is_online' => $availableAgents > 0,
            'active_session' => $activeSession ? [
                'uuid' => $activeSession['uuid'],
                'status' => $activeSession['status'],
                'department_level' => $activeSession['department_level'],
                'category' => $activeSession['category'],
                'language' => $activeSession['language'] ?? 'es-419',
                'subject' => $activeSession['subject'],
                'agent_name' => $activeSession['agent_username'] ?? null,
                'agent_avatar' => $activeSession['agent_avatar'] ?? null,
                'queue_position' => $queuePosition,
                'started_at' => $activeSession['started_at']
            ] : null
        ];
    }

    public function startLiveSession(array $input): array {
        $userId = null;
        $priority = 'medium';

        if ($this->sessionManager->isLoggedIn()) {
            $userId = $this->sessionManager->getActiveAccountId();
            if ($userId) {
                $user = $this->userRepo->findById($userId);
                if ($user) {
                    $tier = (int)($user['subscription_tier'] ?? 0);
                    if ($tier >= 3) {
                        $priority = 'urgent';
                    } else if ($tier >= 1) {
                        $priority = 'high';
                    }
                }
            }
        }

        if ($userId) {
            $existing = $this->supportRepo->getActiveSessionForUser($userId);
            if ($existing) {
                return [
                    'success' => true,
                    'session_uuid' => $existing['uuid'],
                    'status' => $existing['status'],
                    'department_level' => $existing['department_level'],
                    'language' => $existing['language'] ?? 'es-419',
                    'message' => __('msg_support_resumed_session')
                ];
            }
        }

        $availableAgents = $this->supportRepo->getAvailableAgentsCount('all');
        if ($availableAgents === 0) {
            return [
                'success' => false,
                'is_offline' => true,
                'message' => __('support_livechat_unavailable_desc')
            ];
        }

        $category = trim($input['category'] ?? 'general');
        $subject = trim($input['subject'] ?? '');
        $initialMessage = trim($input['initial_message'] ?? '');
        $language = trim($input['language'] ?? '');

        if (empty($language)) {
            if ($userId) {
                try {
                    $userPref = $this->userRepo->getPreferences($userId);
                    if (!empty($userPref['language'])) {
                        $language = $userPref['language'];
                    }
                } catch (\Throwable $e) {}
            }
        }
        if (empty($language)) {
            $language = $_SESSION['lang'] ?? ($_COOKIE['lang'] ?? 'es-419');
        }

        if (!in_array($category, self::ALLOWED_CATEGORIES, true)) {
            $category = 'general';
        }

        if (empty($subject) || mb_strlen($subject) < 3) {
            return [
                'success' => false,
                'message' => __('err_support_invalid_subject')
            ];
        }

        if (empty($initialMessage) || mb_strlen($initialMessage) < 5) {
            return [
                'success' => false,
                'message' => __('err_support_invalid_message')
            ];
        }

        try {
            $sessionUuid = Utils::generateUuid();

            $this->supportRepo->createChatSession([
                'uuid' => $sessionUuid,
                'user_id' => $userId,
                'department_level' => 'l1',
                'category' => $category,
                'language' => $language,
                'subject' => $subject,
                'initial_message' => $initialMessage,
                'priority' => $priority
            ]);

            $userName = 'Guest';
            if ($userId) {
                $user = $this->userRepo->findById($userId);
                $userName = $user['username'] ?? 'User';
            }

            $this->supportRepo->addMessage(
                $sessionUuid,
                'user',
                $userId,
                $userName,
                $initialMessage
            );

            $queuePos = $this->supportRepo->getQueuePosition($sessionUuid, 'l1');

            $this->publishSupportEvent('session_created', $sessionUuid, [
                'session_uuid' => $sessionUuid,
                'queue_position' => $queuePos,
                'category' => $category,
                'language' => $language,
                'subject' => $subject,
                'priority' => $priority,
                'client_username' => $userName,
                'initial_message' => $initialMessage,
                'started_at' => date('Y-m-d H:i:s')
            ]);

            return [
                'success' => true,
                'session_uuid' => $sessionUuid,
                'status' => 'waiting_in_queue',
                'department_level' => 'l1',
                'language' => $language,
                'queue_position' => $queuePos,
                'message' => __('msg_support_chat_requested')
            ];
        } catch (\Throwable $e) {
            Logger::error("Error starting support live chat session: " . $e->getMessage(), ['exception' => $e]);
            return [
                'success' => false,
                'message' => __('err_support_chat_start_failed')
            ];
        }
    }

    private function canAccessSupportSession(array $session): bool {
        $isLoggedIn = $this->sessionManager->isLoggedIn();
        $userId = $isLoggedIn ? (int)$this->sessionManager->getActiveAccountId() : null;
        $permissions = $isLoggedIn ? $this->sessionManager->get('user_permissions', []) : [];
        $isAgent = in_array(\App\Core\System\PermissionsConstants::ACCESS_SUPPORT_PANEL, $permissions, true)
            || (!empty($session['assigned_agent_id']) && (int)$session['assigned_agent_id'] === $userId);

        if ($isAgent) {
            return true;
        }

        if (!empty($session['user_id'])) {
            return $isLoggedIn && (int)$session['user_id'] === $userId;
        }

        return empty($session['user_id']);
    }

    public function getSessionMessages(array $input): array {
        $sessionUuid = trim($input['session_uuid'] ?? '');
        if (empty($sessionUuid)) {
            return [
                'success' => false,
                'message' => __('err_invalid_request')
            ];
        }

        $session = $this->supportRepo->findSessionByUuid($sessionUuid);
        if (!$session) {
            return [
                'success' => false,
                'message' => __('err_support_session_not_found')
            ];
        }

        if (!$this->canAccessSupportSession($session)) {
            return [
                'success' => false,
                'message' => __('err_unauthorized')
            ];
        }

        $isLoggedIn = $this->sessionManager->isLoggedIn();
        $userId = $isLoggedIn ? (int)$this->sessionManager->getActiveAccountId() : null;
        $permissions = $isLoggedIn ? $this->sessionManager->get('user_permissions', []) : [];
        $isAgent = in_array(\App\Core\System\PermissionsConstants::ACCESS_SUPPORT_PANEL, $permissions, true)
            || (!empty($session['assigned_agent_id']) && (int)$session['assigned_agent_id'] === $userId);

        $messages = $this->supportRepo->getSessionMessages($sessionUuid, $isAgent);
        $queuePos = 0;
        if (in_array($session['status'], ['waiting_in_queue', 'escalated'], true)) {
            $queuePos = $this->supportRepo->getQueuePosition($sessionUuid, $session['department_level']);
        }

        return [
            'success' => true,
            'session' => [
                'uuid' => $session['uuid'],
                'status' => $session['status'],
                'department_level' => $session['department_level'],
                'category' => $session['category'],
                'priority' => $session['priority'] ?? 'medium',
                'subject' => $session['subject'],
                'initial_message' => $session['initial_message'] ?? null,
                'client_username' => $session['client_username'] ?? null,
                'client_avatar' => $session['client_avatar'] ?? null,
                'client_email' => $session['client_email'] ?? null,
                'client_subscription_color' => $session['client_subscription_color'] ?? null,
                'client_tier' => $session['client_tier'] ?? null,
                'agent_name' => $session['agent_username'] ?? null,
                'agent_avatar' => $session['agent_avatar'] ?? null,
                'agent_subscription_color' => $session['agent_subscription_color'] ?? null,
                'queue_position' => $queuePos,
                'started_at' => $session['started_at'],
                'user_rating' => $session['user_rating'] ? (int)$session['user_rating'] : null
            ],
            'messages' => $messages
        ];
    }

    private function processUploadedImages(string $sessionUuid, array $input): array {
        $uploadedUrls = [];
        $files = $input['_files'] ?? $_FILES;

        if (empty($files)) {
            return [];
        }

        $fileData = null;
        if (isset($files['images'])) {
            $fileData = $files['images'];
        } elseif (isset($files['image'])) {
            $fileData = $files['image'];
        } elseif (isset($files['file'])) {
            $fileData = $files['file'];
        }

        if (!$fileData) {
            return [];
        }

        $uploadDir = 'support/' . $sessionUuid . '/chat/';
        $maxImages = 5;
        $maxSizeMb = 10;

        if (is_array($fileData['name'])) {
            $count = min(count($fileData['name']), $maxImages);
            for ($i = 0; $i < $count; $i++) {
                if (empty($fileData['name'][$i])) continue;
                if (($fileData['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                    $singleFile = [
                        'name' => $fileData['name'][$i],
                        'type' => $fileData['type'][$i] ?? '',
                        'tmp_name' => $fileData['tmp_name'][$i],
                        'error' => $fileData['error'][$i],
                        'size' => $fileData['size'][$i] ?? 0
                    ];

                    $uploadResult = Utils::uploadAndSanitizeImage($singleFile, $uploadDir, $maxSizeMb);
                    if (!empty($uploadResult['success']) && !empty($uploadResult['file_name'])) {
                        $uploadedUrls[] = Utils::getS3PublicUrl($uploadDir . $uploadResult['file_name']);
                    }
                }
            }
        } else {
            if (($fileData['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $uploadResult = Utils::uploadAndSanitizeImage($fileData, $uploadDir, $maxSizeMb);
                if (!empty($uploadResult['success']) && !empty($uploadResult['file_name'])) {
                    $uploadedUrls[] = Utils::getS3PublicUrl($uploadDir . $uploadResult['file_name']);
                }
            }
        }

        return $uploadedUrls;
    }

    public function sendMessage(array $input): array {
        $sessionUuid = trim($input['session_uuid'] ?? '');
        $message = trim($input['message'] ?? '');

        $uploadedAttachments = $this->processUploadedImages($sessionUuid, $input);
        $existingAttachments = isset($input['attachments']) && is_array($input['attachments']) ? $input['attachments'] : [];
        $allAttachments = array_merge($existingAttachments, $uploadedAttachments);
        $attachments = !empty($allAttachments) ? $allAttachments : null;

        if (empty($sessionUuid) || (empty($message) && empty($attachments))) {
            return [
                'success' => false,
                'message' => __('err_support_invalid_message')
            ];
        }

        $session = $this->supportRepo->findSessionByUuid($sessionUuid);
        if (!$session) {
            return [
                'success' => false,
                'message' => __('err_support_session_not_found')
            ];
        }

        if (!$this->canAccessSupportSession($session)) {
            return [
                'success' => false,
                'message' => __('err_unauthorized')
            ];
        }

        if ($session['status'] === 'closed') {
            return [
                'success' => false,
                'message' => __('err_support_chat_closed')
            ];
        }

        $userId = null;
        $userName = 'Guest';

        if ($this->sessionManager->isLoggedIn()) {
            $userId = $this->sessionManager->getActiveAccountId();
            $user = $this->userRepo->findById($userId);
            $userName = $user['username'] ?? 'User';
        }

        $created = $this->supportRepo->addMessage(
            $sessionUuid,
            'user',
            $userId,
            $userName,
            $message,
            $attachments,
            false
        );

        if (!$created) {
            return [
                'success' => false,
                'message' => __('err_support_message_send_failed')
            ];
        }

        $this->publishSupportEvent('new_message', $sessionUuid, [
            'message' => $created,
            'session_uuid' => $sessionUuid,
            'sender_type' => 'user',
            'sender_name' => $userName,
            'text' => $message,
            'attachments' => $attachments
        ]);

        return [
            'success' => true,
            'message_data' => $created
        ];
    }

    public function endLiveSession(array $input): array {
        $sessionUuid = trim($input['session_uuid'] ?? '');
        if (empty($sessionUuid)) {
            return [
                'success' => false,
                'message' => __('err_invalid_request')
            ];
        }

        $session = $this->supportRepo->findSessionByUuid($sessionUuid);
        if (!$session) {
            return [
                'success' => false,
                'message' => __('err_support_session_not_found')
            ];
        }

        if (!$this->canAccessSupportSession($session)) {
            return [
                'success' => false,
                'message' => __('err_unauthorized')
            ];
        }

        $closed = $this->supportRepo->closeSession($sessionUuid, 'user', null);
        if (!$closed) {
            return [
                'success' => false,
                'message' => __('err_support_close_failed')
            ];
        }

        $this->publishSupportEvent('session_closed', $sessionUuid, [
            'session_uuid' => $sessionUuid,
            'closed_by' => 'user'
        ]);

        return [
            'success' => true,
            'message' => __('msg_support_session_ended')
        ];
    }

    public function submitFeedback(array $input): array {
        $sessionUuid = trim($input['session_uuid'] ?? '');
        $rating = (int)($input['rating'] ?? 5);
        $feedback = trim($input['feedback'] ?? '');

        if (empty($sessionUuid) || $rating < 1 || $rating > 5) {
            return [
                'success' => false,
                'message' => __('err_invalid_request')
            ];
        }

        $session = $this->supportRepo->findSessionByUuid($sessionUuid);
        if (!$session) {
            return [
                'success' => false,
                'message' => __('err_support_session_not_found')
            ];
        }

        if (!$this->canAccessSupportSession($session)) {
            return [
                'success' => false,
                'message' => __('err_unauthorized')
            ];
        }

        $saved = $this->supportRepo->saveSessionFeedback($sessionUuid, $rating, empty($feedback) ? null : $feedback);
        if (!$saved) {
            return [
                'success' => false,
                'message' => __('err_support_feedback_failed')
            ];
        }

        $this->publishSupportEvent('feedback_submitted', $sessionUuid, [
            'session_uuid' => $sessionUuid,
            'rating' => $rating
        ]);

        return [
            'success' => true,
            'message' => __('msg_support_feedback_received')
        ];
    }

    private function publishSupportEvent(string $eventType, ?string $sessionUuid, array $data = []): void {
        try {
            if (class_exists(\App\Config\Database\RedisCache::class)) {
                $redis = (new \App\Config\Database\RedisCache())->getClient();
                if ($redis) {
                    $payload = [
                        'type' => 'support_event',
                        'event' => $eventType,
                        'session_uuid' => $sessionUuid,
                        'data' => $data,
                        'timestamp' => time()
                    ];
                    $redis->publish('support:events', json_encode($payload));
                }
            }
        } catch (\Throwable $e) {
            Logger::error("Failed to publish support event to Redis: " . $e->getMessage());
        }
    }
}
