<?php

namespace App\Core\Interfaces;

interface CanvasRepositoryInterface {
    public function create(array $canvasData): int;
    public function addMember(int $canvasId, int $userId, int $roleId = 1): bool;
    public function getPublicCanvases(int $limit = 20, ?int $currentUserId = null, string $sort = 'newest', int $offset = 0): array;
    public function getOfficialCanvases(?int $currentUserId = null, string $sort = 'newest', int $limit = 50, int $offset = 0): array;
    public function getUserAndJoinedCanvases(int $userId, int $limit = 50, string $filter = 'all', int $offset = 0): array;
    public function getUserCanvasesPaginated(int $ownerId, int $limit, int $offset): array;
    public function countUserCanvases(int $ownerId): int;
    public function countOlderCanvases(int $canvasId, int $ownerId, string $createdAt): int;
    public function deleteCanvases(array $canvasIds, int $ownerId): bool;
    public function getByIdAndOwner(int $id, int $ownerId): ?array;
    public function updateCanvasData(int $id, array $data): bool;
    public function createAccessRequest(int $canvasId, int $userId): bool;
    public function getAccessRequest(int $canvasId, int $userId): ?array;
    public function getRequestById(int $requestId): ?array;
    public function updateRequestStatus(int $requestId, string $status): bool;
    public function getPendingRequests(int $canvasId): array;
    public function getById(int $id): ?array;
    public function getByScopeHash(string $hash): ?array;
    public function getMemberRoles(int $canvasId, int $userId): array;
    public function hasCanvasPermission(int $canvasId, int $userId, string $permission): bool;
    public function assignMemberRole(int $canvasId, int $userId, int $roleId): bool;
    public function removeMemberRole(int $canvasId, int $userId, int $roleId): bool;
    public function getCanvasRoles(?int $canvasId = null): array;
    public function getCanvasPermissions(): array;
    public function createCanvasRole(int $canvasId, string $name, array $permissions): int;
    public function updateCanvasRole(int $roleId, int $canvasId, string $name, ?array $permissions): bool;
    public function updateCanvasRolePermissions(int $roleId, array $permissions): bool;
    public function deleteCanvasRole(int $roleId, int $canvasId): bool;
    public function updateSize(int $canvasId, string $newSize): bool;
    public function countCanvasMembers(int $canvasId): int;
    public function getUserStorageUsed(int $userId): float;
    public function countCanvasSnapshots(int $canvasId): int;
    public function getCanvasByUuid(string $uuid): ?array;
    public function deleteCanvasByUuid(string $uuid): bool;
    public function removeMember(int $canvasId, int $userId): bool;
    public function trimMembersToLimit(int $canvasId, int $limit): bool;
    public function getSnapshot(int $canvasId): ?string;
    public function saveSnapshot(int $canvasId, string $snapshotData): bool;
    public function clearCanvasData(int $canvasId): bool;
    public function getResetSettings(int $canvasId): ?array;
    public function updateResetSettings(int $canvasId, array $settings): bool;
    public function getResizeSettings(int $canvasId): ?array;
    public function updateResizeSettings(int $canvasId, array $settings): bool;
    public function getSnapshotByUuid(string $uuid): ?array;
    public function getSnapshotsByCanvasId(int $canvasId): array;
    public function getSnapshotsHistoryByUuid(string $uuid): array;
    public function saveTemplateMetadata(int $userId, string $filePath, int $fileSize = 0): int;
    public function getUserTemplates(int $userId): array;
    public function deleteTemplate(int $templateId, int $userId): bool;
    public function toggleFavorite(int $userId, int $canvasId): array;

    public function isFavorite(int $userId, int $canvasId): bool;
    public function createInvite(int $canvasId, string $code, string $roleId, ?int $maxUses, ?string $expiresAt, int $createdBy): int;
    public function getInvites(int $canvasId): array;
    public function getInviteByCode(string $code): ?array;
    public function incrementInviteUses(int $inviteId): bool;
    public function revokeInvite(int $inviteId, int $canvasId): bool;
    public function getUserCanvasWeight(int $userId, int $canvasId): int;
}
?>