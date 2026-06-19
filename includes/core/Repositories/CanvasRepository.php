<?php

namespace App\Core\Repositories;

use PDO;
use Exception;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

class CanvasRepository implements CanvasRepositoryInterface {
    private $db;

    public function __construct(DatabaseManager $databaseManager) {
        $this->db = $databaseManager->getConnection(DB::CONN_CANVASES);
    }

    public function create(array $canvasData): int {
        $sql = "INSERT INTO " . DB::TBL_CANVASES . " 
                (uuid, user_id, name, description, privacy) 
                VALUES (:uuid, :user_id, :name, :description, :privacy)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':uuid'        => $canvasData['uuid'],
            ':user_id'     => $canvasData['user_id'],
            ':name'        => $canvasData['name'],
            ':description' => $canvasData['description'],
            ':privacy'     => $canvasData['privacy']
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function addMember(int $canvasId, int $userId, string $role): bool {
        $sql = "INSERT INTO " . DB::TBL_CANVAS_MEMBERS . " 
                (canvas_id, user_id, role) 
                VALUES (:canvas_id, :user_id, :role)";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':canvas_id' => $canvasId,
            ':user_id'   => $userId,
            ':role'      => $role
        ]);
    }

    // --- NUEVOS MÉTODOS PARA GESTIÓN (MANAGE) ---

    public function getUserCanvasesPaginated(int $userId, int $limit, int $offset): array {
        $sql = "SELECT id, uuid, name, description, privacy, size, participant_limit, created_at 
                FROM " . DB::TBL_CANVASES . " 
                WHERE user_id = :uid 
                ORDER BY id DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countUserCanvases(int $userId): int {
        $sql = "SELECT COUNT(*) FROM " . DB::TBL_CANVASES . " WHERE user_id = :uid";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uid' => $userId]);
        return (int)$stmt->fetchColumn();
    }

    public function deleteCanvases(array $canvasIds, int $userId): bool {
        if (empty($canvasIds)) {
            return false;
        }

        $placeholders = implode(',', array_fill(0, count($canvasIds), '?'));
        
        $sql = "DELETE FROM " . DB::TBL_CANVASES . " WHERE id IN ($placeholders) AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        
        $params = array_merge($canvasIds, [$userId]);
        return $stmt->execute($params);
    }
}
?>