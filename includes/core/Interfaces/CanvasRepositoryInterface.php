<?php

namespace App\Core\Interfaces;

interface CanvasRepositoryInterface {
    public function create(array $canvasData): int;
    public function addMember(int $canvasId, int $userId, string $role): bool;
    
    // Métodos para Manage
    public function getUserCanvasesPaginated(int $userId, int $limit, int $offset): array;
    public function countUserCanvases(int $userId): int;
    public function deleteCanvases(array $canvasIds, int $userId): bool;

    // Métodos para Edit
    public function getByIdAndUser(int $id, int $userId): ?array;
    public function updateCanvasData(int $id, int $userId, array $data): bool;

    // Nuevos Métodos para Solicitudes de Acceso
    public function createAccessRequest(int $canvasId, int $userId): bool;
    public function getAccessRequest(int $canvasId, int $userId): ?array;
    public function getRequestById(int $requestId): ?array;
    public function updateRequestStatus(int $requestId, string $status): bool;
    public function getPendingRequests(int $canvasId): array;
    
    // Utilidades
    public function getById(int $id): ?array;
    public function getMemberRole(int $canvasId, int $userId): ?string;

    // ==========================================
    // NUEVOS MÉTODOS DE PERSISTENCIA (SNAPSHOTS)
    // ==========================================
    public function getSnapshot(int $canvasId): ?string;
    public function saveSnapshot(int $canvasId, string $snapshotData): bool;

    // ==========================================
    // NUEVOS MÉTODOS DE REINICIOS PROGRAMADOS
    // ==========================================
    public function getResetSettings(int $canvasId): ?array;
    public function updateResetSettings(int $canvasId, array $settings): bool;

    // ==========================================
    // NUEVO MÉTODO PARA GALERÍA HISTÓRICA
    // ==========================================
    public function getSnapshotsHistoryByUuid(string $uuid): array;
}
?>