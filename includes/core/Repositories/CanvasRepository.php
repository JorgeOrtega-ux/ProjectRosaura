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
}
?>