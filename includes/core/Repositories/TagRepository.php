<?php
// includes/core/Repositories/TagRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\TagRepositoryInterface;
use PDO;

class TagRepository implements TagRepositoryInterface {
    private $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function getAll() {
        $stmt = $this->db->query("SELECT * FROM tags ORDER BY type ASC, name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById($id) {
        $stmt = $this->db->prepare("SELECT * FROM tags WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function findByName($name) {
        $stmt = $this->db->prepare("SELECT * FROM tags WHERE name = :name");
        $stmt->execute(['name' => $name]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($name, $type) {
        $stmt = $this->db->prepare("INSERT INTO tags (name, type) VALUES (:name, :type)");
        return $stmt->execute(['name' => $name, 'type' => $type]);
    }

    public function update($id, $name, $type) {
        $stmt = $this->db->prepare("UPDATE tags SET name = :name, type = :type WHERE id = :id");
        return $stmt->execute(['id' => $id, 'name' => $name, 'type' => $type]);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM tags WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
?>