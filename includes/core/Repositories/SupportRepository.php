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
}
