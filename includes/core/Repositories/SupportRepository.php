<?php

namespace App\Core\Repositories;

use App\Core\Interfaces\SupportRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;
use App\Core\Helpers\Utils;
use PDO;
use PDOException;
use Exception;

class SupportRepository implements SupportRepositoryInterface {
    private PDO $pdo;

    public function __construct(DatabaseManager $db) {
        $this->pdo = $db->getConnection(DB::CONN_IDENTITY);
    }

    public function createTicket(array $data): string {
        try {
            $uuid = $data['uuid'] ?? Utils::generateUuid();
            $userId = (int)$data['user_id'];
            $category = $data['category'] ?? 'general';
            $subject = trim($data['subject'] ?? '');
            $message = trim($data['message'] ?? '');
            $ipAddress = $data['ip_address'] ?? Utils::getIpAddress();
            $userAgent = $data['user_agent'] ?? substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

            $stmt = $this->pdo->prepare("
                INSERT INTO " . DB::TBL_SUPPORT_TICKETS . " 
                (uuid, user_id, category, subject, message, status, priority, ip_address, user_agent, created_at, updated_at)
                VALUES 
                (:uuid, :user_id, :category, :subject, :message, 'open', 'medium', :ip_address, :user_agent, NOW(), NOW())
            ");

            $stmt->execute([
                ':uuid' => $uuid,
                ':user_id' => $userId,
                ':category' => $category,
                ':subject' => $subject,
                ':message' => $message,
                ':ip_address' => $ipAddress,
                ':user_agent' => $userAgent
            ]);

            return $uuid;
        } catch (PDOException $e) {
            Logger::database("Failed to create support ticket in database: " . $e->getMessage(), 'error', [
                'user_id' => $data['user_id'] ?? null,
                'category' => $data['category'] ?? null
            ]);
            throw new Exception('err_database_error');
        }
    }

    public function findByUuid(string $uuid): ?array {
        try {
            $stmt = $this->pdo->prepare("
                SELECT st.*, u.username, u.email 
                FROM " . DB::TBL_SUPPORT_TICKETS . " st
                JOIN " . DB::TBL_USERS . " u ON st.user_id = u.id
                WHERE st.uuid = :uuid
                LIMIT 1
            ");
            $stmt->execute([':uuid' => $uuid]);
            $ticket = $stmt->fetch(PDO::FETCH_ASSOC);
            return $ticket ?: null;
        } catch (PDOException $e) {
            Logger::database("Failed to fetch support ticket by UUID: " . $e->getMessage(), 'error');
            return null;
        }
    }

    public function getTicketsByUser(int $userId, int $limit = 20, int $offset = 0): array {
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, uuid, category, subject, status, priority, created_at, updated_at
                FROM " . DB::TBL_SUPPORT_TICKETS . "
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (PDOException $e) {
            Logger::database("Failed to fetch user support tickets: " . $e->getMessage(), 'error');
            return [];
        }
    }

    public function getAllTickets(array $filters = [], int $limit = 50, int $offset = 0): array {
        try {
            $sql = "
                SELECT st.*, u.username, u.email 
                FROM " . DB::TBL_SUPPORT_TICKETS . " st
                LEFT JOIN " . DB::TBL_USERS . " u ON st.user_id = u.id
                WHERE 1=1
            ";
            $params = [];

            if (!empty($filters['status'])) {
                $sql .= " AND st.status = :status";
                $params[':status'] = $filters['status'];
            }
            if (!empty($filters['category'])) {
                $sql .= " AND st.category = :category";
                $params[':category'] = $filters['category'];
            }
            if (!empty($filters['priority'])) {
                $sql .= " AND st.priority = :priority";
                $params[':priority'] = $filters['priority'];
            }
            if (!empty($filters['search'])) {
                $sql .= " AND (st.subject LIKE :search OR u.username LIKE :search OR u.email LIKE :search)";
                $params[':search'] = '%' . $filters['search'] . '%';
            }

            $sql .= " ORDER BY st.created_at DESC LIMIT :limit OFFSET :offset";

            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (PDOException $e) {
            Logger::database("Failed to fetch all tickets: " . $e->getMessage(), 'error');
            return [];
        }
    }

    public function updateTicketStatus(string $uuid, string $status, ?string $priority = null): bool {
        try {
            $sql = "UPDATE " . DB::TBL_SUPPORT_TICKETS . " SET status = :status";
            $params = [':status' => $status, ':uuid' => $uuid];

            if ($priority !== null) {
                $sql .= ", priority = :priority";
                $params[':priority'] = $priority;
            }

            $sql .= ", updated_at = NOW() WHERE uuid = :uuid";

            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute($params);
        } catch (PDOException $e) {
            Logger::database("Failed to update ticket status: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function createChatSession(array $data): string {
        try {
            $uuid = $data['uuid'] ?? Utils::generateUuid();
            $userId = isset($data['user_id']) ? (int)$data['user_id'] : null;
            $category = $data['category'] ?? 'general';
            $language = $data['language'] ?? 'es-419';
            $subject = trim($data['subject'] ?? '');
            $initialMessage = trim($data['initial_message'] ?? '');
            $priority = $data['priority'] ?? 'medium';
            $level = $data['department_level'] ?? 'l1';

            $stmt = $this->pdo->prepare("
                INSERT INTO " . DB::TBL_SUPPORT_CHAT_SESSIONS . " 
                (uuid, user_id, department_level, status, category, language, subject, initial_message, priority, started_at, created_at, updated_at)
                VALUES 
                (:uuid, :user_id, :department_level, 'waiting_in_queue', :category, :language, :subject, :initial_message, :priority, NOW(), NOW(), NOW())
            ");

            $stmt->execute([
                ':uuid' => $uuid,
                ':user_id' => $userId,
                ':department_level' => $level,
                ':category' => $category,
                ':language' => $language,
                ':subject' => $subject,
                ':initial_message' => $initialMessage,
                ':priority' => $priority
            ]);

            return $uuid;
        } catch (PDOException $e) {
            Logger::database("Failed to create chat session: " . $e->getMessage(), 'error');
            throw new Exception('err_database_error');
        }
    }

    public function findSessionByUuid(string $uuid): ?array {
        try {
            $stmt = $this->pdo->prepare("
                SELECT scs.*, 
                       u.username AS client_username, u.email AS client_email, u.profile_picture AS client_avatar, u.subscription_tier AS client_tier,
                       st.color AS client_role_color,
                       a.username AS agent_username, a.email AS agent_email, a.profile_picture AS agent_avatar
                FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " scs
                LEFT JOIN " . DB::TBL_USERS . " u ON scs.user_id = u.id
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                LEFT JOIN " . DB::TBL_USERS . " a ON scs.assigned_agent_id = a.id
                WHERE scs.uuid = :uuid
                LIMIT 1
            ");
            $stmt->execute([':uuid' => $uuid]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            return $session ?: null;
        } catch (PDOException $e) {
            Logger::database("Failed to fetch session by UUID: " . $e->getMessage(), 'error');
            return null;
        }
    }

    public function getActiveSessionForUser(int $userId): ?array {
        try {
            $stmt = $this->pdo->prepare("
                SELECT scs.*, 
                       a.username AS agent_username, a.email AS agent_email, a.profile_picture AS agent_avatar
                FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " scs
                LEFT JOIN " . DB::TBL_USERS . " a ON scs.assigned_agent_id = a.id
                WHERE scs.user_id = :user_id AND scs.status IN ('waiting_in_queue', 'active', 'escalated')
                ORDER BY scs.created_at DESC
                LIMIT 1
            ");
            $stmt->execute([':user_id' => $userId]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            return $session ?: null;
        } catch (PDOException $e) {
            Logger::database("Failed to fetch active session for user: " . $e->getMessage(), 'error');
            return null;
        }
    }

    public function getQueuePosition(string $sessionUuid, string $level): int {
        try {
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                WHERE department_level = :level 
                  AND status IN ('waiting_in_queue', 'escalated')
                  AND created_at <= (
                      SELECT created_at FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " WHERE uuid = :uuid LIMIT 1
                  )
            ");
            $stmt->execute([':level' => $level, ':uuid' => $sessionUuid]);
            return (int)($stmt->fetchColumn() ?: 1);
        } catch (PDOException $e) {
            Logger::database("Failed to calculate queue position: " . $e->getMessage(), 'error');
            return 1;
        }
    }

    public function getAvailableAgentsCount(string $level = 'l1'): int {
        try {
            $sql = "
                SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_AGENT_STATUS . "
                WHERE status IN ('online', 'busy')
                  AND last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ";
            $params = [];

            if ($level !== 'all') {
                $sql .= " AND level = :level";
                $params[':level'] = $level;
            }

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return (int)($stmt->fetchColumn() ?: 0);
        } catch (PDOException $e) {
            Logger::database("Failed to fetch available agents count: " . $e->getMessage(), 'error');
            return 0;
        }
    }

    public function getQueueSessions(string $level, int $limit = 50): array {
        try {
            $sql = "
                SELECT scs.*, 
                       u.username AS client_username, u.email AS client_email, u.profile_picture AS client_avatar, u.subscription_tier AS client_tier,
                       st.color AS client_role_color
                FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " scs
                LEFT JOIN " . DB::TBL_USERS . " u ON scs.user_id = u.id
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                WHERE scs.status IN ('waiting_in_queue', 'escalated')
            ";
            $params = [];

            if ($level !== 'all') {
                $sql .= " AND scs.department_level = :level";
                $params[':level'] = $level;
            }

            $sql .= " ORDER BY CASE scs.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, scs.created_at ASC LIMIT :limit";

            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (PDOException $e) {
            Logger::database("Failed to fetch queue sessions: " . $e->getMessage(), 'error');
            return [];
        }
    }

    public function getAgentActiveSessions(int $agentId): array {
        try {
            $stmt = $this->pdo->prepare("
                SELECT scs.*, 
                       u.username AS client_username, u.email AS client_email, u.profile_picture AS client_avatar, u.subscription_tier AS client_tier,
                       st.color AS client_role_color
                FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " scs
                LEFT JOIN " . DB::TBL_USERS . " u ON scs.user_id = u.id
                LEFT JOIN subscription_tiers st ON u.subscription_tier = st.tier_level
                WHERE scs.assigned_agent_id = :agent_id AND scs.status = 'active'
                ORDER BY scs.updated_at DESC
            ");
            $stmt->execute([':agent_id' => $agentId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (PDOException $e) {
            Logger::database("Failed to fetch agent active sessions: " . $e->getMessage(), 'error');
            return [];
        }
    }

    public function claimSession(string $sessionUuid, int $agentId): bool {
        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("
                SELECT id, status FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                WHERE uuid = :uuid FOR UPDATE
            ");
            $stmt->execute([':uuid' => $sessionUuid]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session || !in_array($session['status'], ['waiting_in_queue', 'escalated'], true)) {
                $this->pdo->rollBack();
                return false;
            }

            $updateStmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                SET assigned_agent_id = :agent_id, status = 'active', accepted_at = IFNULL(accepted_at, NOW()), updated_at = NOW()
                WHERE id = :id
            ");
            $updateStmt->execute([
                ':agent_id' => $agentId,
                ':id' => $session['id']
            ]);

            $agentStmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_AGENT_STATUS . "
                SET current_active_chats = current_active_chats + 1
                WHERE agent_id = :agent_id
            ");
            $agentStmt->execute([':agent_id' => $agentId]);

            $this->pdo->commit();
            return true;
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            Logger::database("Failed to claim chat session: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function escalateSession(string $sessionUuid, int $fromAgentId, string $toLevel, string $reason, ?string $internalNote = null): bool {
        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("
                SELECT id, department_level, assigned_agent_id FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                WHERE uuid = :uuid FOR UPDATE
            ");
            $stmt->execute([':uuid' => $sessionUuid]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                $this->pdo->rollBack();
                return false;
            }

            $fromLevel = $session['department_level'];
            $sessionId = (int)$session['id'];

            $updateStmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                SET department_level = :to_level, status = 'escalated', assigned_agent_id = NULL, updated_at = NOW()
                WHERE id = :id
            ");
            $updateStmt->execute([
                ':to_level' => $toLevel,
                ':id' => $sessionId
            ]);

            $transferStmt = $this->pdo->prepare("
                INSERT INTO " . DB::TBL_SUPPORT_CHAT_TRANSFERS . "
                (session_id, from_agent_id, to_agent_id, from_level, to_level, reason, internal_note, created_at)
                VALUES
                (:session_id, :from_agent_id, NULL, :from_level, :to_level, :reason, :internal_note, NOW())
            ");
            $transferStmt->execute([
                ':session_id' => $sessionId,
                ':from_agent_id' => $fromAgentId,
                ':from_level' => $fromLevel,
                ':to_level' => $toLevel,
                ':reason' => $reason,
                ':internal_note' => $internalNote
            ]);

            $agentStmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_AGENT_STATUS . "
                SET current_active_chats = GREATEST(0, current_active_chats - 1)
                WHERE agent_id = :agent_id
            ");
            $agentStmt->execute([':agent_id' => $fromAgentId]);

            $this->pdo->commit();
            return true;
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            Logger::database("Failed to escalate chat session: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function reassignSession(string $sessionUuid, int $toAgentId): bool {
        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("
                SELECT id, assigned_agent_id FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                WHERE uuid = :uuid FOR UPDATE
            ");
            $stmt->execute([':uuid' => $sessionUuid]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                $this->pdo->rollBack();
                return false;
            }

            $oldAgentId = $session['assigned_agent_id'] ? (int)$session['assigned_agent_id'] : null;
            $sessionId = (int)$session['id'];

            $updateStmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                SET assigned_agent_id = :to_agent_id, status = 'active', updated_at = NOW()
                WHERE id = :id
            ");
            $updateStmt->execute([
                ':to_agent_id' => $toAgentId,
                ':id' => $sessionId
            ]);

            if ($oldAgentId) {
                $agentOldStmt = $this->pdo->prepare("
                    UPDATE " . DB::TBL_SUPPORT_AGENT_STATUS . "
                    SET current_active_chats = GREATEST(0, current_active_chats - 1)
                    WHERE agent_id = :agent_id
                ");
                $agentOldStmt->execute([':agent_id' => $oldAgentId]);
            }

            $agentNewStmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_AGENT_STATUS . "
                SET current_active_chats = current_active_chats + 1
                WHERE agent_id = :agent_id
            ");
            $agentNewStmt->execute([':agent_id' => $toAgentId]);

            $this->pdo->commit();
            return true;
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            Logger::database("Failed to reassign chat session: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function closeSession(string $sessionUuid, string $closedBy, ?string $resolutionSummary = null): bool {
        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("
                SELECT id, assigned_agent_id, status FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                WHERE uuid = :uuid FOR UPDATE
            ");
            $stmt->execute([':uuid' => $sessionUuid]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$session || $session['status'] === 'closed') {
                $this->pdo->rollBack();
                return false;
            }

            $agentId = $session['assigned_agent_id'] ? (int)$session['assigned_agent_id'] : null;

            $updateStmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                SET status = 'closed', closed_by = :closed_by, closed_at = NOW(), resolution_summary = :resolution_summary, updated_at = NOW()
                WHERE id = :id
            ");
            $updateStmt->execute([
                ':closed_by' => $closedBy,
                ':resolution_summary' => $resolutionSummary,
                ':id' => $session['id']
            ]);

            if ($agentId) {
                $agentStmt = $this->pdo->prepare("
                    UPDATE " . DB::TBL_SUPPORT_AGENT_STATUS . "
                    SET current_active_chats = GREATEST(0, current_active_chats - 1)
                    WHERE agent_id = :agent_id
                ");
                $agentStmt->execute([':agent_id' => $agentId]);
            }

            $this->pdo->commit();
            return true;
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            Logger::database("Failed to close chat session: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function saveSessionFeedback(string $sessionUuid, int $rating, ?string $feedback = null): bool {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_CHAT_SESSIONS . "
                SET user_rating = :rating, user_feedback = :feedback, updated_at = NOW()
                WHERE uuid = :uuid
            ");
            return $stmt->execute([
                ':rating' => max(1, min(5, $rating)),
                ':feedback' => $feedback,
                ':uuid' => $sessionUuid
            ]);
        } catch (PDOException $e) {
            Logger::database("Failed to save session feedback: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function addMessage(string $sessionUuid, string $senderType, ?int $senderId, string $senderName, string $message, ?array $attachments = null, bool $isInternal = false): ?array {
        try {
            $sessionStmt = $this->pdo->prepare("SELECT id FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " WHERE uuid = :uuid LIMIT 1");
            $sessionStmt->execute([':uuid' => $sessionUuid]);
            $sessionId = $sessionStmt->fetchColumn();

            if (!$sessionId) {
                return null;
            }

            $msgUuid = Utils::generateUuid();
            $attachJson = $attachments ? json_encode($attachments) : null;

            $stmt = $this->pdo->prepare("
                INSERT INTO " . DB::TBL_SUPPORT_CHAT_MESSAGES . "
                (uuid, session_id, sender_type, sender_id, sender_name, message, attachments, is_internal, created_at)
                VALUES
                (:uuid, :session_id, :sender_type, :sender_id, :sender_name, :message, :attachments, :is_internal, NOW())
            ");

            $stmt->execute([
                ':uuid' => $msgUuid,
                ':session_id' => $sessionId,
                ':sender_type' => $senderType,
                ':sender_id' => $senderId,
                ':sender_name' => $senderName,
                ':message' => $message,
                ':attachments' => $attachJson,
                ':is_internal' => $isInternal ? 1 : 0
            ]);

            $updStmt = $this->pdo->prepare("UPDATE " . DB::TBL_SUPPORT_CHAT_SESSIONS . " SET updated_at = NOW() WHERE id = :id");
            $updStmt->execute([':id' => $sessionId]);

            return [
                'uuid' => $msgUuid,
                'sender_type' => $senderType,
                'sender_id' => $senderId,
                'sender_name' => $senderName,
                'message' => $message,
                'attachments' => $attachments,
                'is_internal' => $isInternal,
                'created_at' => date('Y-m-d H:i:s')
            ];
        } catch (PDOException $e) {
            Logger::database("Failed to add chat message: " . $e->getMessage(), 'error');
            return null;
        }
    }

    public function getSessionMessages(string $sessionUuid, bool $includeInternal = false, int $limit = 100, int $offset = 0): array {
        try {
            $sql = "
                SELECT scm.uuid, scm.sender_type, scm.sender_id, scm.sender_name, scm.message, scm.attachments, scm.is_internal, scm.created_at,
                       u.profile_picture AS sender_avatar
                FROM " . DB::TBL_SUPPORT_CHAT_MESSAGES . " scm
                JOIN " . DB::TBL_SUPPORT_CHAT_SESSIONS . " scs ON scm.session_id = scs.id
                LEFT JOIN " . DB::TBL_USERS . " u ON scm.sender_id = u.id
                WHERE scs.uuid = :uuid
            ";

            if (!$includeInternal) {
                $sql .= " AND scm.is_internal = 0";
            }

            $sql .= " ORDER BY scm.created_at ASC LIMIT :limit OFFSET :offset";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':uuid', $sessionUuid);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as &$row) {
                if (!empty($row['attachments'])) {
                    $row['attachments'] = json_decode($row['attachments'], true);
                }
                $row['is_internal'] = (bool)$row['is_internal'];
            }

            return $rows;
        } catch (PDOException $e) {
            Logger::database("Failed to fetch session messages: " . $e->getMessage(), 'error');
            return [];
        }
    }

    public function getAgentStatus(int $agentId): ?array {
        try {
            $stmt = $this->pdo->prepare("
                SELECT sas.*, u.username, u.email, u.profile_picture AS avatar
                FROM " . DB::TBL_SUPPORT_AGENT_STATUS . " sas
                JOIN " . DB::TBL_USERS . " u ON sas.agent_id = u.id
                WHERE sas.agent_id = :agent_id
                LIMIT 1
            ");
            $stmt->execute([':agent_id' => $agentId]);
            $status = $stmt->fetch(PDO::FETCH_ASSOC);
            return $status ?: null;
        } catch (PDOException $e) {
            Logger::database("Failed to fetch agent status: " . $e->getMessage(), 'error');
            return null;
        }
    }

    public function updateAgentStatus(int $agentId, string $status, ?string $level = null, ?int $maxChats = null): bool {
        try {
            $existing = $this->getAgentStatus($agentId);
            if (!$existing) {
                $stmt = $this->pdo->prepare("
                    INSERT INTO " . DB::TBL_SUPPORT_AGENT_STATUS . "
                    (agent_id, status, level, max_concurrent_chats, last_heartbeat)
                    VALUES
                    (:agent_id, :status, :level, :max_chats, NOW())
                ");
                return $stmt->execute([
                    ':agent_id' => $agentId,
                    ':status' => $status,
                    ':level' => $level ?? 'l1',
                    ':max_chats' => $maxChats ?? 3
                ]);
            }

            $sql = "UPDATE " . DB::TBL_SUPPORT_AGENT_STATUS . " SET status = :status, last_heartbeat = NOW()";
            $params = [':status' => $status, ':agent_id' => $agentId];

            if ($level !== null) {
                $sql .= ", level = :level";
                $params[':level'] = $level;
            }
            if ($maxChats !== null) {
                $sql .= ", max_concurrent_chats = :max_chats";
                $params[':max_chats'] = $maxChats;
            }

            $sql .= " WHERE agent_id = :agent_id";

            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute($params);
        } catch (PDOException $e) {
            Logger::database("Failed to update agent status: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function heartbeatAgent(int $agentId): bool {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE " . DB::TBL_SUPPORT_AGENT_STATUS . "
                SET last_heartbeat = NOW()
                WHERE agent_id = :agent_id
            ");
            return $stmt->execute([':agent_id' => $agentId]);
        } catch (PDOException $e) {
            Logger::database("Failed to update agent heartbeat: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function getOnlineAgents(string $level = 'all'): array {
        try {
            $sql = "
                SELECT sas.*, u.username, u.email, u.profile_picture AS avatar
                FROM " . DB::TBL_SUPPORT_AGENT_STATUS . " sas
                JOIN " . DB::TBL_USERS . " u ON sas.agent_id = u.id
                WHERE sas.status IN ('online', 'busy')
                  AND sas.last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            ";
            $params = [];

            if ($level !== 'all') {
                $sql .= " AND sas.level = :level";
                $params[':level'] = $level;
            }

            $sql .= " ORDER BY sas.current_active_chats ASC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (PDOException $e) {
            Logger::database("Failed to fetch online agents: " . $e->getMessage(), 'error');
            return [];
        }
    }

    public function getCannedResponses(?string $minLevel = null, ?string $language = null): array {
        try {
            $sql = "SELECT scr.*, u.username AS creator_username FROM " . DB::TBL_SUPPORT_CANNED_RESPONSES . " scr LEFT JOIN " . DB::TBL_USERS . " u ON scr.created_by = u.id";
            $where = [];
            $params = [];

            if ($minLevel === 'l1') {
                $where[] = "scr.min_level = 'l1'";
            } else if ($minLevel === 'l2') {
                $where[] = "scr.min_level IN ('l1', 'l2')";
            }

            if (!empty($language)) {
                $where[] = "(scr.language = :language OR scr.language IS NULL)";
                $params[':language'] = $language;
            }

            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }

            $sql .= " ORDER BY scr.category ASC, scr.shortcut ASC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (PDOException $e) {
            Logger::database("Failed to fetch canned responses: " . $e->getMessage(), 'error');
            return [];
        }
    }

    public function saveCannedResponse(array $data): string {
        try {
            $uuid = $data['uuid'] ?? Utils::generateUuid();
            $shortcut = trim($data['shortcut'] ?? '');
            $title = trim($data['title'] ?? '');
            $content = trim($data['content'] ?? '');
            $category = $data['category'] ?? 'general';
            $language = $data['language'] ?? 'es-419';
            $minLevel = $data['min_level'] ?? 'l1';
            $createdBy = isset($data['created_by']) ? (int)$data['created_by'] : null;

            $checkStmt = $this->pdo->prepare("SELECT id FROM " . DB::TBL_SUPPORT_CANNED_RESPONSES . " WHERE uuid = :uuid LIMIT 1");
            $checkStmt->execute([':uuid' => $uuid]);
            $existingId = $checkStmt->fetchColumn();

            if ($existingId) {
                $stmt = $this->pdo->prepare("
                    UPDATE " . DB::TBL_SUPPORT_CANNED_RESPONSES . "
                    SET shortcut = :shortcut, title = :title, content = :content, category = :category, language = :language, min_level = :min_level, updated_at = NOW()
                    WHERE id = :id
                ");
                $stmt->execute([
                    ':shortcut' => $shortcut,
                    ':title' => $title,
                    ':content' => $content,
                    ':category' => $category,
                    ':language' => $language,
                    ':min_level' => $minLevel,
                    ':id' => $existingId
                ]);
            } else {
                $stmt = $this->pdo->prepare("
                    INSERT INTO " . DB::TBL_SUPPORT_CANNED_RESPONSES . "
                    (uuid, shortcut, title, content, category, language, min_level, created_by, created_at, updated_at)
                    VALUES
                    (:uuid, :shortcut, :title, :content, :category, :language, :min_level, :created_by, NOW(), NOW())
                ");
                $stmt->execute([
                    ':uuid' => $uuid,
                    ':shortcut' => $shortcut,
                    ':title' => $title,
                    ':content' => $content,
                    ':category' => $category,
                    ':language' => $language,
                    ':min_level' => $minLevel,
                    ':created_by' => $createdBy
                ]);
            }

            return $uuid;
        } catch (PDOException $e) {
            Logger::database("Failed to save canned response: " . $e->getMessage(), 'error');
            throw new Exception('err_database_error');
        }
    }

    public function deleteCannedResponse(string $uuid): bool {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM " . DB::TBL_SUPPORT_CANNED_RESPONSES . " WHERE uuid = :uuid");
            return $stmt->execute([':uuid' => $uuid]);
        } catch (PDOException $e) {
            Logger::database("Failed to delete canned response: " . $e->getMessage(), 'error');
            return false;
        }
    }

    public function getSupportMetrics(): array {
        try {
            $totalChats = (int)$this->pdo->query("SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS)->fetchColumn();
            $activeChats = (int)$this->pdo->query("SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " WHERE status IN ('waiting_in_queue', 'active', 'escalated')")->fetchColumn();
            $closedChats = (int)$this->pdo->query("SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " WHERE status = 'closed'")->fetchColumn();
            $totalTickets = (int)$this->pdo->query("SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_TICKETS)->fetchColumn();
            $openTickets = (int)$this->pdo->query("SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_TICKETS . " WHERE status = 'open'")->fetchColumn();

            $avgRating = (float)$this->pdo->query("SELECT AVG(user_rating) FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " WHERE user_rating IS NOT NULL")->fetchColumn();

            $transfersL1toL2 = (int)$this->pdo->query("SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_CHAT_TRANSFERS . " WHERE from_level = 'l1' AND to_level = 'l2'")->fetchColumn();
            $transfersL2toL3 = (int)$this->pdo->query("SELECT COUNT(*) FROM " . DB::TBL_SUPPORT_CHAT_TRANSFERS . " WHERE to_level = 'l3'")->fetchColumn();

            $avgWaitSeconds = (float)$this->pdo->query("
                SELECT AVG(TIMESTAMPDIFF(SECOND, started_at, accepted_at)) 
                FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " 
                WHERE accepted_at IS NOT NULL
            ")->fetchColumn();

            $avgDurationSeconds = (float)$this->pdo->query("
                SELECT AVG(TIMESTAMPDIFF(SECOND, accepted_at, closed_at)) 
                FROM " . DB::TBL_SUPPORT_CHAT_SESSIONS . " 
                WHERE accepted_at IS NOT NULL AND closed_at IS NOT NULL
            ")->fetchColumn();

            return [
                'total_chats' => $totalChats,
                'active_chats' => $activeChats,
                'closed_chats' => $closedChats,
                'total_tickets' => $totalTickets,
                'open_tickets' => $openTickets,
                'avg_csat' => round($avgRating, 1),
                'transfers_l1_l2' => $transfersL1toL2,
                'transfers_l2_l3' => $transfersL2toL3,
                'avg_frt_seconds' => round($avgWaitSeconds),
                'avg_duration_seconds' => round($avgDurationSeconds)
            ];
        } catch (PDOException $e) {
            Logger::database("Failed to fetch support metrics: " . $e->getMessage(), 'error');
            return [];
        }
    }
}
