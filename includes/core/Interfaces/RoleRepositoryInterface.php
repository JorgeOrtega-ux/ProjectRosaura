<?php
// includes/core/Interfaces/RoleRepositoryInterface.php

namespace App\Core\Interfaces;

interface RoleRepositoryInterface {
    public function getAll(): array;
    public function findById(int $id): ?array;
    public function findByName(string $name): ?array;
    
    public function create(string $name, string $colorJson, int $weight = 1): bool;
    public function update(int $id, string $name, string $colorJson, int $weight, int $executorWeight): bool;
    public function delete(int $id, int $executorWeight): bool;

    public function getAllPermissions(): array;
    public function getRolePermissions(int $roleId): array;
    public function assignPermissionsToRole(int $roleId, array $permissionsArray, int $executorWeight): bool;

    public function syncUserRoles(int $userId, array $roleIds, int $executorWeight): bool;
    public function getUserRoles(int $userId): array;
    public function getMergedPermissionsForUser(int $userId): array;
    public function getHighestPriorityRole(int $userId): ?array;

    // NUEVO: Métodos de Exposición de Invalidación
    public function invalidateGlobalRolesCache(): void;
    public function invalidateRoleCache(int $roleId): void;
    public function invalidateUserCache(int $userId): void;
    public function invalidateGlobalPermissionsCache(): void;
}
?>