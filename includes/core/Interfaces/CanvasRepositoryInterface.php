<?php

namespace App\Core\Interfaces;

interface CanvasRepositoryInterface {
    public function create(array $canvasData): int;
    public function addMember(int $canvasId, int $userId, string $role): bool;
    
    // Métodos para Manage
    public function getUserCanvasesPaginated(int $userId, int $limit, int $offset): array;
    public function countUserCanvases(int $userId): int;
    public function deleteCanvases(array $canvasIds, int $userId): bool;

    // Nuevos Métodos para Edit
    public function getByIdAndUser(int $id, int $userId): ?array;
    public function updateCanvasData(int $id, int $userId, array $data): bool;
}
?>