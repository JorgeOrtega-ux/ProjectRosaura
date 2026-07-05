<?php
$filePath = __DIR__ . '/../api/services/CanvasServices.php';
$content = file_get_contents($filePath);

$newMethods = <<<EOT

    public function getCanvasRoles(int \$userId, int \$canvasId, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$isOwner = (\$canvas['owner_id'] === \$userId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (!\$isOwner && !\$this->canvasRepository->hasCanvasPermission(\$canvasId, \$userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para gestionar roles.'];
            }

            \$roles = \$this->canvasRepository->getCanvasRoles(\$canvasId);
            return ['success' => true, 'data' => \$roles];
        } catch (Exception \$e) {
            Logger::error('Error getting canvas roles.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }

    public function getCanvasPermissions(int \$userId, int \$canvasId, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$isOwner = (\$canvas['owner_id'] === \$userId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (!\$isOwner && !\$this->canvasRepository->hasCanvasPermission(\$canvasId, \$userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para ver los permisos.'];
            }

            \$permissions = \$this->canvasRepository->getCanvasPermissions();
            return ['success' => true, 'data' => \$permissions];
        } catch (Exception \$e) {
            Logger::error('Error getting canvas permissions.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }

    public function createCanvasRole(int \$userId, int \$canvasId, string \$name, array \$permissions, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$isOwner = (\$canvas['owner_id'] === \$userId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (!\$isOwner && !\$this->canvasRepository->hasCanvasPermission(\$canvasId, \$userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para crear roles.'];
            }

            if (\$canvas['owner_id'] !== null) {
                \$owner = \$this->userRepository->findById(\$canvas['owner_id']);
                \$tier = \$owner['subscription_tier'] ?? 0;
                if (\$tier < 2) { 
                    return ['success' => false, 'message' => 'El plan actual del dueño del lienzo no permite usar roles personalizados.'];
                }
            }

            \$roleId = \$this->canvasRepository->createCanvasRole(\$canvasId, \$name, \$permissions);
            return ['success' => true, 'message' => 'Rol creado correctamente.', 'data' => ['id' => \$roleId]];
        } catch (Exception \$e) {
            Logger::error('Error creating canvas role.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }

    public function updateCanvasRole(int \$userId, int \$roleId, int \$canvasId, string \$name, array \$permissions, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$isOwner = (\$canvas['owner_id'] === \$userId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (!\$isOwner && !\$this->canvasRepository->hasCanvasPermission(\$canvasId, \$userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para editar roles.'];
            }

            \$success = \$this->canvasRepository->updateCanvasRole(\$roleId, \$canvasId, \$name, \$permissions);
            if (\$success) return ['success' => true, 'message' => 'Rol actualizado correctamente.'];
            
            return ['success' => false, 'message' => 'El rol no se pudo editar.'];
        } catch (Exception \$e) {
            Logger::error('Error updating canvas role.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }

    public function deleteCanvasRole(int \$userId, int \$roleId, int \$canvasId, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$isOwner = (\$canvas['owner_id'] === \$userId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (!\$isOwner && !\$this->canvasRepository->hasCanvasPermission(\$canvasId, \$userId, 'manage_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para eliminar roles.'];
            }

            \$success = \$this->canvasRepository->deleteCanvasRole(\$roleId, \$canvasId);
            if (\$success) return ['success' => true, 'message' => 'Rol eliminado correctamente.'];
            
            return ['success' => false, 'message' => 'El rol no se pudo eliminar o es de sistema.'];
        } catch (Exception \$e) {
            Logger::error('Error deleting canvas role.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }
EOT;

$content = preg_replace('/}(?=[^}]*$)/', $newMethods . "\n}", $content);

file_put_contents($filePath, $content);
echo "Services roles added.\n";
