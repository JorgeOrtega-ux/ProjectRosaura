<?php

namespace App\Api\Services\Admin;

use App\Core\Interfaces\SupportRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\System\PermissionsConstants as PC;
use App\Core\System\Logger;
use App\Core\Mail\Mailer;

class AdminSupportService {
    private SupportRepositoryInterface $supportRepo;
    private SessionManagerInterface $sessionManager;
    private UserRepositoryInterface $userRepo;

    public function __construct(
        SupportRepositoryInterface $supportRepo,
        SessionManagerInterface $sessionManager,
        UserRepositoryInterface $userRepo
    ) {
        $this->supportRepo = $supportRepo;
        $this->sessionManager = $sessionManager;
        $this->userRepo = $userRepo;
    }

    private function getCurrentAgentId(): ?int {
        if (!$this->sessionManager->isLoggedIn()) {
            return null;
        }
        return (int)$this->sessionManager->getActiveAccountId();
    }

    private function hasPermission(string $permission): bool {
        $permissions = $this->sessionManager->get('user_permissions', []);
        return in_array($permission, $permissions, true);
    }

    private function getAgentLevel(): string {
        if ($this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L3)) {
            return 'l3';
        }
        if ($this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L2)) {
            return 'l2';
        }
        if ($this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L1)) {
            return 'l1';
        }
        return 'l1';
    }

    public function getAgentStatus(): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::ACCESS_SUPPORT_PANEL)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $status = $this->supportRepo->getAgentStatus($agentId);
        $level = $this->getAgentLevel();

        if (!$status) {
            $this->supportRepo->updateAgentStatus($agentId, 'offline', $level, 3);
            $status = $this->supportRepo->getAgentStatus($agentId);
        }

        return [
            'success' => true,
            'agent_id' => $agentId,
            'status' => $status['status'] ?? 'offline',
            'level' => $level,
            'current_active_chats' => (int)($status['current_active_chats'] ?? 0),
            'max_concurrent_chats' => (int)($status['max_concurrent_chats'] ?? 3),
            'can_escalate' => $this->hasPermission(PC::SUPPORT_CHAT_ESCALATE),
            'can_reassign' => $this->hasPermission(PC::SUPPORT_CHAT_REASSIGN),
            'can_view_metrics' => $this->hasPermission(PC::SUPPORT_VIEW_METRICS),
            'can_manage_canned' => $this->hasPermission(PC::SUPPORT_MANAGE_CANNED)
        ];
    }

    public function updateAgentStatus(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::ACCESS_SUPPORT_PANEL)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $status = trim($input['status'] ?? 'offline');
        if (!in_array($status, ['online', 'busy', 'away', 'offline'], true)) {
            $status = 'offline';
        }

        $maxChats = isset($input['max_concurrent_chats']) ? (int)$input['max_concurrent_chats'] : null;
        if ($maxChats !== null) {
            $maxChats = max(1, min(10, $maxChats));
        }

        $level = $this->getAgentLevel();
        $this->supportRepo->updateAgentStatus($agentId, $status, $level, $maxChats);

        $this->publishSupportEvent('agent_status_updated', null, [
            'agent_id' => $agentId,
            'status' => $status,
            'level' => $level
        ]);

        return [
            'success' => true,
            'status' => $status,
            'message' => __('msg_support_agent_status_updated')
        ];
    }

    public function getLiveQueues(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::ACCESS_SUPPORT_PANEL)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $this->supportRepo->heartbeatAgent($agentId);

        $l1Queue = $this->supportRepo->getQueueSessions('l1', 30);
        $l2Queue = ($this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L2) || $this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L3))
            ? $this->supportRepo->getQueueSessions('l2', 30)
            : [];
        $l3Queue = $this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L3)
            ? $this->supportRepo->getQueueSessions('l3', 30)
            : [];

        $myActiveSessions = $this->supportRepo->getAgentActiveSessions($agentId);
        $onlineAgents = $this->supportRepo->getOnlineAgents('all');

        return [
            'success' => true,
            'queues' => [
                'l1' => $l1Queue,
                'l2' => $l2Queue,
                'l3' => $l3Queue
            ],
            'my_active_sessions' => $myActiveSessions,
            'online_agents' => $onlineAgents
        ];
    }

    public function claimSession(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::ACCESS_SUPPORT_PANEL)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $sessionUuid = trim($input['session_uuid'] ?? '');
        if (empty($sessionUuid)) {
            return ['success' => false, 'message' => __('err_invalid_request')];
        }

        $session = $this->supportRepo->findSessionByUuid($sessionUuid);
        if (!$session) {
            return ['success' => false, 'message' => __('err_support_session_not_found')];
        }

        $sessionLevel = $session['department_level'];
        if ($sessionLevel === 'l2' && !$this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L2) && !$this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L3)) {
            return ['success' => false, 'message' => __('err_support_level_insufficient')];
        }
        if ($sessionLevel === 'l3' && !$this->hasPermission(PC::SUPPORT_CHAT_ATTEND_L3)) {
            return ['success' => false, 'message' => __('err_support_level_insufficient')];
        }

        $claimed = $this->supportRepo->claimSession($sessionUuid, $agentId);
        if (!$claimed) {
            return ['success' => false, 'message' => __('err_support_claim_failed')];
        }

        $agentUser = $this->userRepo->findById($agentId);
        $agentName = $agentUser['username'] ?? 'Support Agent';

        $joinMsg = $this->supportRepo->addMessage(
            $sessionUuid,
            'system',
            null,
            'System',
            __('msg_support_agent_joined', ['agent' => $agentName]),
            null,
            false
        );

        $this->publishSupportEvent('session_claimed', $sessionUuid, [
            'session_uuid' => $sessionUuid,
            'agent_id' => $agentId,
            'agent_name' => $agentName,
            'system_message' => $joinMsg
        ]);

        return [
            'success' => true,
            'message' => __('msg_support_chat_claimed')
        ];
    }

    public function escalateSession(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::SUPPORT_CHAT_ESCALATE)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $sessionUuid = trim($input['session_uuid'] ?? '');
        $toLevel = trim($input['to_level'] ?? 'l2');
        $reason = trim($input['reason'] ?? '');
        $internalNote = trim($input['internal_note'] ?? '');

        if (empty($sessionUuid) || !in_array($toLevel, ['l2', 'l3'], true)) {
            return ['success' => false, 'message' => __('err_invalid_request')];
        }

        if (empty($reason)) {
            return ['success' => false, 'message' => __('err_support_escalation_reason_required')];
        }

        $session = $this->supportRepo->findSessionByUuid($sessionUuid);
        if (!$session) {
            return ['success' => false, 'message' => __('err_support_session_not_found')];
        }

        $escalated = $this->supportRepo->escalateSession($sessionUuid, $agentId, $toLevel, $reason, empty($internalNote) ? null : $internalNote);
        if (!$escalated) {
            return ['success' => false, 'message' => __('err_support_escalation_failed')];
        }

        $agentUser = $this->userRepo->findById($agentId);
        $agentName = $agentUser['username'] ?? 'Support Agent';

        if (!empty($internalNote)) {
            $noteMsg = $this->supportRepo->addMessage(
                $sessionUuid,
                'internal_note',
                $agentId,
                $agentName,
                __('lbl_internal_escalation_note', ['from' => strtoupper($session['department_level']), 'to' => strtoupper($toLevel)]) . ': ' . $internalNote,
                null,
                true
            );

            $this->publishSupportEvent('internal_note', $sessionUuid, [
                'session_uuid' => $sessionUuid,
                'message' => $noteMsg
            ]);
        }

        $targetDept = $toLevel === 'l3' ? __('lbl_dept_l3') : __('lbl_dept_l2');
        $escMsg = $this->supportRepo->addMessage(
            $sessionUuid,
            'system',
            null,
            'System',
            __('msg_support_chat_escalated_notice', ['dept' => $targetDept]),
            null,
            false
        );

        $this->publishSupportEvent('session_escalated', $sessionUuid, [
            'session_uuid' => $sessionUuid,
            'to_level' => $toLevel,
            'reason' => $reason,
            'system_message' => $escMsg
        ]);

        return [
            'success' => true,
            'message' => __('msg_support_escalated_successfully')
        ];
    }

    public function reassignSession(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::SUPPORT_CHAT_REASSIGN)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $sessionUuid = trim($input['session_uuid'] ?? '');
        $toAgentId = (int)($input['to_agent_id'] ?? 0);

        if (empty($sessionUuid) || $toAgentId <= 0) {
            return ['success' => false, 'message' => __('err_invalid_request')];
        }

        $reassigned = $this->supportRepo->reassignSession($sessionUuid, $toAgentId);
        if (!$reassigned) {
            return ['success' => false, 'message' => __('err_support_reassign_failed')];
        }

        $targetUser = $this->userRepo->findById($toAgentId);
        $targetName = $targetUser['username'] ?? 'Support Agent';

        $reassignMsg = $this->supportRepo->addMessage(
            $sessionUuid,
            'system',
            null,
            'System',
            __('msg_support_chat_reassigned_notice', ['agent' => $targetName]),
            null,
            false
        );

        $this->publishSupportEvent('session_reassigned', $sessionUuid, [
            'session_uuid' => $sessionUuid,
            'to_agent_id' => $toAgentId,
            'to_agent_name' => $targetName,
            'system_message' => $reassignMsg
        ]);

        return [
            'success' => true,
            'message' => __('msg_support_reassigned_successfully')
        ];
    }

    public function sendAgentMessage(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::ACCESS_SUPPORT_PANEL)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $sessionUuid = trim($input['session_uuid'] ?? '');
        $message = trim($input['message'] ?? '');
        $attachments = isset($input['attachments']) && is_array($input['attachments']) ? $input['attachments'] : null;

        if (empty($sessionUuid) || empty($message)) {
            return ['success' => false, 'message' => __('err_support_invalid_message')];
        }

        $agentUser = $this->userRepo->findById($agentId);
        $agentName = $agentUser['username'] ?? 'Agent';

        $created = $this->supportRepo->addMessage(
            $sessionUuid,
            'agent',
            $agentId,
            $agentName,
            $message,
            $attachments,
            false
        );

        if (!$created) {
            return ['success' => false, 'message' => __('err_support_message_send_failed')];
        }

        $this->publishSupportEvent('new_message', $sessionUuid, [
            'message' => $created,
            'session_uuid' => $sessionUuid
        ]);

        return [
            'success' => true,
            'message_data' => $created
        ];
    }

    public function addInternalNote(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::ACCESS_SUPPORT_PANEL)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $sessionUuid = trim($input['session_uuid'] ?? '');
        $note = trim($input['note'] ?? '');

        if (empty($sessionUuid) || empty($note)) {
            return ['success' => false, 'message' => __('err_invalid_request')];
        }

        $agentUser = $this->userRepo->findById($agentId);
        $agentName = $agentUser['username'] ?? 'Agent';

        $created = $this->supportRepo->addMessage(
            $sessionUuid,
            'internal_note',
            $agentId,
            $agentName,
            $note,
            null,
            true
        );

        if (!$created) {
            return ['success' => false, 'message' => __('err_support_message_send_failed')];
        }

        $this->publishSupportEvent('internal_note', $sessionUuid, [
            'message' => $created,
            'session_uuid' => $sessionUuid
        ]);

        return [
            'success' => true,
            'message_data' => $created
        ];
    }

    public function closeSession(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::ACCESS_SUPPORT_PANEL)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $sessionUuid = trim($input['session_uuid'] ?? '');
        $summary = trim($input['resolution_summary'] ?? '');

        if (empty($sessionUuid)) {
            return ['success' => false, 'message' => __('err_invalid_request')];
        }

        $closed = $this->supportRepo->closeSession($sessionUuid, 'agent', empty($summary) ? null : $summary);
        if (!$closed) {
            return ['success' => false, 'message' => __('err_support_close_failed')];
        }

        $closeMsg = $this->supportRepo->addMessage(
            $sessionUuid,
            'system',
            null,
            'System',
            __('msg_support_chat_closed_by_agent'),
            null,
            false
        );

        $this->publishSupportEvent('session_closed', $sessionUuid, [
            'session_uuid' => $sessionUuid,
            'closed_by' => 'agent',
            'summary' => $summary,
            'system_message' => $closeMsg
        ]);

        return [
            'success' => true,
            'message' => __('msg_support_session_ended')
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
            Logger::error("Failed to publish admin support event to Redis: " . $e->getMessage());
        }
    }

    public function getCannedResponses(array $input): array {
        if (!$this->hasPermission(PC::ACCESS_SUPPORT_PANEL)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $level = $this->getAgentLevel();
        $responses = $this->supportRepo->getCannedResponses($level);

        return [
            'success' => true,
            'responses' => $responses
        ];
    }

    public function saveCannedResponse(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::SUPPORT_MANAGE_CANNED)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $shortcut = trim($input['shortcut'] ?? '');
        $title = trim($input['title'] ?? '');
        $content = trim($input['content'] ?? '');
        $category = trim($input['category'] ?? 'general');
        $minLevel = trim($input['min_level'] ?? 'l1');
        $uuid = trim($input['uuid'] ?? '');

        if (empty($shortcut) || empty($title) || empty($content)) {
            return ['success' => false, 'message' => __('err_support_invalid_canned')];
        }

        $shortcut = strtolower(preg_replace('/[^a-z0-9_]/', '', str_replace(' ', '_', $shortcut)));

        $savedUuid = $this->supportRepo->saveCannedResponse([
            'uuid' => empty($uuid) ? null : $uuid,
            'shortcut' => $shortcut,
            'title' => $title,
            'content' => $content,
            'category' => $category,
            'min_level' => $minLevel,
            'created_by' => $agentId
        ]);

        return [
            'success' => true,
            'uuid' => $savedUuid,
            'message' => __('msg_support_canned_saved')
        ];
    }

    public function deleteCannedResponse(array $input): array {
        if (!$this->hasPermission(PC::SUPPORT_MANAGE_CANNED)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $uuid = trim($input['uuid'] ?? '');
        if (empty($uuid)) {
            return ['success' => false, 'message' => __('err_invalid_request')];
        }

        $deleted = $this->supportRepo->deleteCannedResponse($uuid);
        return [
            'success' => $deleted,
            'message' => $deleted ? __('msg_support_canned_deleted') : __('err_support_delete_failed')
        ];
    }

    public function getTicketsList(array $input): array {
        if (!$this->hasPermission(PC::SUPPORT_TICKETS_MANAGE)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $filters = [
            'status' => $input['status'] ?? '',
            'category' => $input['category'] ?? '',
            'priority' => $input['priority'] ?? '',
            'search' => $input['search'] ?? ''
        ];

        $limit = isset($input['limit']) ? (int)$input['limit'] : 50;
        $offset = isset($input['offset']) ? (int)$input['offset'] : 0;

        $tickets = $this->supportRepo->getAllTickets($filters, $limit, $offset);

        return [
            'success' => true,
            'tickets' => $tickets
        ];
    }

    public function getTicketDetail(array $input): array {
        if (!$this->hasPermission(PC::SUPPORT_TICKETS_MANAGE)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $uuid = trim($input['uuid'] ?? '');
        if (empty($uuid)) {
            return ['success' => false, 'message' => __('err_invalid_request')];
        }

        $ticket = $this->supportRepo->findByUuid($uuid);
        if (!$ticket) {
            return ['success' => false, 'message' => __('err_support_ticket_not_found')];
        }

        return [
            'success' => true,
            'ticket' => $ticket
        ];
    }

    public function updateTicketStatus(array $input): array {
        if (!$this->hasPermission(PC::SUPPORT_TICKETS_MANAGE)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $uuid = trim($input['uuid'] ?? '');
        $status = trim($input['status'] ?? 'open');
        $priority = isset($input['priority']) ? trim($input['priority']) : null;

        if (empty($uuid) || !in_array($status, ['open', 'in_progress', 'resolved', 'closed'], true)) {
            return ['success' => false, 'message' => __('err_invalid_request')];
        }

        $updated = $this->supportRepo->updateTicketStatus($uuid, $status, $priority);
        return [
            'success' => $updated,
            'message' => $updated ? __('msg_support_ticket_updated') : __('err_support_update_failed')
        ];
    }

    public function replyTicket(array $input): array {
        $agentId = $this->getCurrentAgentId();
        if (!$agentId || !$this->hasPermission(PC::SUPPORT_TICKETS_MANAGE)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $uuid = trim($input['uuid'] ?? '');
        $replyMessage = trim($input['message'] ?? '');

        if (empty($uuid) || empty($replyMessage)) {
            return ['success' => false, 'message' => __('err_support_invalid_message')];
        }

        $ticket = $this->supportRepo->findByUuid($uuid);
        if (!$ticket) {
            return ['success' => false, 'message' => __('err_support_ticket_not_found')];
        }

        $this->supportRepo->updateTicketStatus($uuid, 'in_progress');

        try {
            if (!empty($ticket['email'])) {
                Mailer::sendCustomEmail(
                    $ticket['email'],
                    __('email_support_reply_subject', ['subject' => $ticket['subject']]),
                    $replyMessage
                );
            }
        } catch (\Throwable $e) {
            Logger::error("Failed to send ticket reply email: " . $e->getMessage());
        }

        return [
            'success' => true,
            'message' => __('msg_support_ticket_replied')
        ];
    }

    public function getSupportMetrics(): array {
        if (!$this->hasPermission(PC::SUPPORT_VIEW_METRICS)) {
            return ['success' => false, 'message' => __('err_unauthorized')];
        }

        $metrics = $this->supportRepo->getSupportMetrics();
        return [
            'success' => true,
            'metrics' => $metrics
        ];
    }
}
