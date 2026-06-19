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
                (uuid, user_id, name, description, privacy, size, max_participants) 
                VALUES (:uuid, :user_id, :name, :description, :privacy, :size, :max_participants)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':uuid'             => $canvasData['uuid'],
            ':user_id'          => $canvasData['user_id'],
            ':name'             => $canvasData['name'],
            ':description'      => $canvasData['description'],
            ':privacy'          => $canvasData['privacy'],
            ':size'             => $canvasData['size'],
            ':max_participants' => $canvasData['max_participants']
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

    // --- MÉTODOS PARA GESTIÓN (MANAGE) ---

    public function getUserCanvasesPaginated(int $userId, int $limit, int $offset): array {
        // Se corrigió participant_limit por max_participants para que concuerde con db_canvases.sql
        $sql = "SELECT id, uuid, name, description, privacy, size, max_participants, created_at 
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

    // --- NUEVOS MÉTODOS PARA EDICIÓN (EDIT) ---

    public function getByIdAndUser(int $id, int $userId): ?array {
        $sql = "SELECT * FROM " . DB::TBL_CANVASES . " WHERE id = :id AND user_id = :user_id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id' => $id, 
            ':user_id' => $userId
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function updateCanvasData(int $id, int $userId, array $data): bool {
        $sql = "UPDATE " . DB::TBL_CANVASES . " 
                SET name = :name, 
                    description = :description, 
                    privacy = :privacy, 
                    max_participants = :max_participants
                WHERE id = :id AND user_id = :user_id";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':name'             => $data['name'],
            ':description'      => $data['description'],
            ':privacy'          => $data['privacy'],
            ':max_participants' => $data['max_participants'],
            ':id'               => $id,
            ':user_id'          => $userId
        ]);
    }
}
?>