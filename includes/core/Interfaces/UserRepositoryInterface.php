<?php
// includes/core/Interfaces/UserRepositoryInterface.php

namespace App\Core\Interfaces;

interface UserRepositoryInterface {
    public function findById(int $id): ?array;
    public function findByEmail(string $email): ?array;
    public function findByUsername(string $username): ?array;
    public function createUser(array $data): int;
    public function updateStatus(int $id, string $status): bool;
}
?>