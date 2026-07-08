<?php

namespace App\Core\Interfaces;

interface CanvasRepositoryInterface {
    public function create(array $canvasData): int;
    public function addMember(int $canvasId, int $userId, int $roleId = 1): bool;
    
    // Métodos para Home / Explora
    public function getPublicCanvases(int $limit = 20, ?int $currentUserId = null, string $sort = 'newest'): array;
    public function getOfficialCanvases(?int $currentUserId = null, string $sort = 'newest'): array;
    public function getUserAndJoinedCanvases(int $userId, int $limit = 50, string $filter = 'all'): array;

    // Métodos para Manage
    public function getUserCanvasesPaginated(int $ownerId, int $limit, int $offset): array;
    public function countUserCanvases(int $ownerId): int;
    public function countOlderCanvases(int $canvasId, int $ownerId, string $createdAt): int;
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
    public function getMemberRoles(int $canvasId, int $userId): array;
    public function hasCanvasPermission(int $canvasId, int $userId, string $permission): bool;
    public function assignMemberRole(int $canvasId, int $userId, int $roleId): bool;
    public function removeMemberRole(int $canvasId, int $userId, int $roleId): bool;
    
    // --- NUEVOS MÉTODOS PARA ROLES PERSONALIZADOS ---
    public function getCanvasRoles(?int $canvasId = null): array;
    public function getCanvasPermissions(): array;
    public function createCanvasRole(int $canvasId, string $name, array $permissions): int;
    public function updateCanvasRole(int $roleId, int $canvasId, string $name, ?array $permissions): bool;
    public function updateCanvasRolePermissions(int $roleId, array $permissions): bool;
    public function deleteCanvasRole(int $roleId, int $canvasId): bool;
    
    // EXPANSIÓN EN VIVO
    public function updateSize(int $canvasId, string $newSize): bool;

    // --- NUEVOS MÉTODOS PARA LIMITES DE PLANES PREMIUM ---
    public function countCanvasMembers(int $canvasId): int;
    public function getUserStorageUsed(int $userId): float;
    public function countCanvasSnapshots(int $canvasId): int;

    // --- NUEVOS MÉTODOS PARA ELIMINAR / SALIR DE LIENZO ÚNICO ---
    public function getCanvasByUuid(string $uuid): ?array;
    public function deleteCanvasByUuid(string $uuid): bool;
    public function removeMember(int $canvasId, int $userId): bool;
    public function trimMembersToLimit(int $canvasId, int $limit): bool;

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
    // NUEVOS MÉTODOS DE EXPANSIONES PROGRAMADAS
    // ==========================================
    public function getResizeSettings(int $canvasId): ?array;
    public function updateResizeSettings(int $canvasId, array $settings): bool;

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

    // ==========================================
    // NUEVOS MÉTODOS PARA INVITACIONES
    // ==========================================
    public function createInvite(int $canvasId, string $code, string $roleId, ?int $maxUses, ?string $expiresAt, int $createdBy): int;
    public function getInvites(int $canvasId): array;
    public function getInviteByCode(string $code): ?array;
    public function incrementInviteUses(int $inviteId): bool;
    public function revokeInvite(int $inviteId, int $canvasId): bool;
}
?>