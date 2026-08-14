<?php

namespace App\Core\Interfaces;

interface SupportRepositoryInterface {
    public function createTicket(array $data): string;
    public function findByUuid(string $uuid): ?array;
    public function getTicketsByUser(int $userId, int $limit = 20, int $offset = 0): array;
    public function getAllTickets(array $filters = [], int $limit = 50, int $offset = 0): array;
    public function updateTicketStatus(string $uuid, string $status, ?string $priority = null): bool;

    public function createChatSession(array $data): string;
    public function findSessionByUuid(string $uuid): ?array;
    public function getActiveSessionForUser(int $userId): ?array;
    public function getQueuePosition(string $sessionUuid, string $level): int;
    public function getAvailableAgentsCount(string $level = 'l1'): int;
    public function getQueueSessions(string $level, int $limit = 50): array;
    public function getAgentActiveSessions(int $agentId): array;
    public function claimSession(string $sessionUuid, int $agentId): bool;
    public function escalateSession(string $sessionUuid, int $fromAgentId, string $toLevel, string $reason, ?string $internalNote = null): bool;
    public function reassignSession(string $sessionUuid, int $toAgentId): bool;
    public function closeSession(string $sessionUuid, string $closedBy, ?string $resolutionSummary = null): bool;
    public function saveSessionFeedback(string $sessionUuid, int $rating, ?string $feedback = null): bool;

    public function addMessage(string $sessionUuid, string $senderType, ?int $senderId, string $senderName, string $message, ?array $attachments = null, bool $isInternal = false): ?array;
    public function getSessionMessages(string $sessionUuid, bool $includeInternal = false, int $limit = 100, int $offset = 0): array;

    public function getAgentStatus(int $agentId): ?array;
    public function updateAgentStatus(int $agentId, string $status, ?string $level = null, ?int $maxChats = null): bool;
    public function heartbeatAgent(int $agentId): bool;
    public function getOnlineAgents(string $level = 'all'): array;

    public function getCannedResponses(?string $minLevel = null, ?string $language = null): array;
    public function saveCannedResponse(array $data): string;
    public function deleteCannedResponse(string $uuid): bool;

    public function getSupportMetrics(): array;
}
