<?php
// includes/core/Interfaces/TagRepositoryInterface.php

namespace App\Core\Interfaces;

interface TagRepositoryInterface {
    public function getAll();
    public function findById($id);
    public function findByName($name);
    public function create($name, $type);
    public function update($id, $name, $type);
    public function delete($id);
}
?>