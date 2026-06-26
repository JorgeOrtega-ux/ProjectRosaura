<?php

namespace App\Core\Interfaces;

interface CanvasRepositoryInterface {
    public function create(array $canvasData): int;
    public function addMember(int $canvasId, int $userId, string $role): bool;
    
    // Métodos para Home / Explora
    public function getPublicCanvases(int $limit = 20, ?int $currentUserId = null): array;
    public function getOfficialCanvases(?int $currentUserId = null): array;

    // Métodos para Manage
    public function getUserCanvasesPaginated(int $ownerId, int $limit, int $offset): array;
    public function countUserCanvases(int $ownerId): int;
    public function deleteCanvases(array $canvasIds, int $ownerId): bool;

    // Métodos para Edit
    public function getByIdAndOwner(int $id, int $ownerId): ?array;
    public function updateCanvasData(int $id, array $data): bool;

    // Métodos para Solicitudes de Acceso
    public function createAccessRequest(int $canvasId, int $userId): bool;
    public function getAccessRequest(int $canvasId, int $userId): ?array;
    public function getRequestById(int $requestId): ?array;
    public function updateRequestStatus(int $requestId, string $status): bool;
    public function getPendingRequests(int $canvasId): array;
    
    // Utilidades
    public function getById(int $id): ?array;
    public function getByScopeHash(string $hash): ?array;
    public function getMemberRole(int $canvasId, int $userId): ?string;
    public function updateMemberRole(int $canvasId, int $userId, string $role): bool;

    // --- NUEVOS MÉTODOS PARA LIMITES DE PLANES PREMIUM ---
    public function countCanvasMembers(int $canvasId): int;
    public function getUserStorageUsed(int $userId): float;
    public function countCanvasSnapshots(int $canvasId): int;

    // --- NUEVOS MÉTODOS PARA ELIMINAR / SALIR DE LIENZO ÚNICO ---
    public function getCanvasByUuid(string $uuid): ?array;
    public function deleteCanvasByUuid(string $uuid): bool;
    public function removeMember(int $canvasId, int $userId): bool;

    // ==========================================
    // NUEVOS MÉTODOS DE PERSISTENCIA (SNAPSHOTS)
    // ==========================================
    public function getSnapshot(int $canvasId): ?string;
    public function saveSnapshot(int $canvasId, string $snapshotData): bool;
    public function clearCanvasData(int $canvasId): bool;

    // ==========================================
    // NUEVOS MÉTODOS DE REINICIOS PROGRAMADOS
    // ==========================================
    public function getResetSettings(int $canvasId): ?array;
    public function updateResetSettings(int $canvasId, array $settings): bool;

    // ==========================================
    // NUEVO MÉTODO PARA GALERÍA HISTÓRICA Y VISUALIZADOR
    // ==========================================
    public function getSnapshotByUuid(string $uuid): ?array;
    public function getSnapshotsByCanvasId(int $canvasId): array;
    public function getSnapshotsHistoryByUuid(string $uuid): array;

    // ==========================================
    // NUEVOS MÉTODOS PARA LIBRERÍA DE PLANTILLAS DE USUARIO
    // ==========================================
    public function saveTemplateMetadata(int $userId, string $filePath): int;
    public function getUserTemplates(int $userId): array;
    public function deleteTemplate(int $templateId, int $userId): bool;

    // ==========================================
    // NUEVO MÉTODO PARA FAVORITOS (Transacción Atómica)
    // ==========================================
    public function toggleFavorite(int $userId, int $canvasId): array;

    public function isFavorite(int $userId, int $canvasId): bool;
}
?>