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

    public function getByType($type) {
        $stmt = $this->db->prepare("SELECT * FROM tags WHERE type = :type ORDER BY name ASC");
        $stmt->execute(['type' => $type]);
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

    public function create($name, $type, $gender = null) {
        $stmt = $this->db->prepare("INSERT INTO tags (name, type, gender) VALUES (:name, :type, :gender)");
        return $stmt->execute(['name' => $name, 'type' => $type, 'gender' => $gender]);
    }

    // --- NUEVO MÉTODO MÁGICO: FIND OR CREATE ---
    public function findOrCreate($name, $type, $gender = null) {
        $name = trim($name);
        
        // 1. Buscamos si ya existe exactamente con ese nombre
        $existing = $this->findByName($name);
        if ($existing) {
            return (int) $existing['id'];
        }
        
        // 2. Si no existe, lo creamos
        $this->create($name, $type, $gender);
        
        // 3. Retornamos el ID recién insertado
        return (int) $this->db->lastInsertId();
    }

    public function update($id, $name, $type, $gender = null) {
        $stmt = $this->db->prepare("UPDATE tags SET name = :name, type = :type, gender = :gender WHERE id = :id");
        return $stmt->execute(['id' => $id, 'name' => $name, 'type' => $type, 'gender' => $gender]);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM tags WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
?>