<?php
// includes/core/Interfaces/TagRepositoryInterface.php

namespace App\Core\Interfaces;

interface TagRepositoryInterface {
    public function getAll();
    public function getByType($type);
    public function findById($id);
    public function findByName($name);
    public function create($name, $type, $gender = null);
    
    // --- MÉTODO AGREGADO A LA INTERFAZ ---
    public function findOrCreate($name, $type, $gender = null);
    
    public function update($id, $name, $type, $gender = null);
    public function delete($id);

    // --- NUEVO MÉTODO FALLBACK PARA TOP GLOBAL ---
    public function getGlobalTopCategories(int $limit = 5): array;
}
?>