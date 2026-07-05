<?php

$filePath = __DIR__ . '/../api/services/CanvasServices.php';
$content = file_get_contents($filePath);

// 1. resizeCanvas
$content = preg_replace(
    '/\$role = \$this->canvasRepository->getMemberRole\(\$canvasId, \$userId\);\s*if \(\$role !== \'admin\'\) \{/',
    'if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, \'manage_settings\')) {',
    $content
);

// 2. leaveCanvas
$content = preg_replace(
    '/\$role = \$this->canvasRepository->getMemberRole\(\$canvas\[\'id\'\], \$userId\);\s*if \(!\$role\) \{/',
    '$roles = $this->canvasRepository->getMemberRoles($canvas[\'id\'], $userId); if (empty($roles)) {',
    $content
);

// 3. changeMemberRole -> assignMemberRole
$searchChangeMemberRole = <<<EOT
    public function changeMemberRole(int \$requesterId, int \$canvasId, int \$targetUserId, string \$newRole, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$requesterRole = \$this->canvasRepository->getMemberRole(\$canvasId, \$requesterId);
            \$isOwner = (\$canvas['owner_id'] === \$requesterId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (\$isOwner) \$requesterRole = 'admin';

            if (\$requesterRole !== 'admin') {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos de administrador en este lienzo.'];
            }

            if (\$canvas['owner_id'] === \$targetUserId) {
                return ['success' => false, 'message' => 'No puedes cambiar el rol del creador original del lienzo.'];
            }

            \$validRoles = ['viewer', 'editor', 'admin'];
            if (!in_array(\$newRole, \$validRoles)) {
                return ['success' => false, 'message' => 'Rol inválido.'];
            }

            if (\$newRole !== 'viewer' && \$canvas['owner_id'] !== null) {
                \$owner = \$this->userRepository->findById(\$canvas['owner_id']);
                \$tier = \$owner['subscription_tier'] ?? 0;
                if (!SubscriptionPlanConstants::hasFeature(\$tier, 'advanced_roles')) {
                    return ['success' => false, 'message' => 'El plan actual del dueño del lienzo no permite asignar roles avanzados.'];
                }
            }

            \$updated = \$this->canvasRepository->updateMemberRole(\$canvasId, \$targetUserId, \$newRole);
            if (\$updated) return ['success' => true, 'message' => 'Rol actualizado correctamente.'];
            
            return ['success' => false, 'message' => 'No se pudo actualizar el rol.'];
        } catch (Exception \$e) {
            Logger::error('Error changing member role.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }
EOT;

$replaceChangeMemberRole = <<<EOT
    public function assignMemberRole(int \$requesterId, int \$canvasId, int \$targetUserId, int \$roleId, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$isOwner = (\$canvas['owner_id'] === \$requesterId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (!\$isOwner && !\$this->canvasRepository->hasCanvasPermission(\$canvasId, \$requesterId, 'assign_roles')) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para asignar roles en este lienzo.'];
            }

            if (\$canvas['owner_id'] === \$targetUserId) {
                return ['success' => false, 'message' => 'No puedes modificar los roles del creador original del lienzo.'];
            }
            
            // Peso de quien asigna
            \$requesterMaxWeight = 0;
            if (\$isOwner) {
                \$requesterMaxWeight = 100;
            } else {
                \$reqRoles = \$this->canvasRepository->getMemberRoles(\$canvasId, \$requesterId);
                foreach (\$reqRoles as \$rr) {
                    if (\$rr['weight'] > \$requesterMaxWeight) \$requesterMaxWeight = \$rr['weight'];
                }
            }
            
            // Obtener info del rol a asignar
            \$roles = \$this->canvasRepository->getCanvasRoles(\$canvasId);
            \$targetRole = null;
            foreach (\$roles as \$r) {
                if (\$r['id'] == \$roleId) {
                    \$targetRole = \$r;
                    break;
                }
            }
            
            if (!\$targetRole) {
                return ['success' => false, 'message' => 'El rol especificado no existe o no pertenece a este lienzo.'];
            }
            
            if (\$targetRole['weight'] >= \$requesterMaxWeight && !\$isOwner) {
                return ['success' => false, 'message' => 'No tienes permisos para asignar un rol de igual o mayor jerarquía que el tuyo.'];
            }

            // Validar plan premium para roles personalizados
            if (!\$targetRole['is_system'] && \$canvas['owner_id'] !== null) {
                \$owner = \$this->userRepository->findById(\$canvas['owner_id']);
                \$tier = \$owner['subscription_tier'] ?? 0;
                // tier 2 => advanced
                if (\$tier < 2) { 
                    return ['success' => false, 'message' => 'El plan actual del dueño del lienzo no permite usar roles personalizados.'];
                }
            }

            \$updated = \$this->canvasRepository->assignMemberRole(\$canvasId, \$targetUserId, \$roleId);
            if (\$updated) return ['success' => true, 'message' => 'Rol asignado correctamente.'];
            
            return ['success' => false, 'message' => 'El usuario ya tiene asignado este rol.'];
        } catch (Exception \$e) {
            Logger::error('Error assigning member role.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }
EOT;

$content = str_replace($searchChangeMemberRole, $replaceChangeMemberRole, $content);

// 4. removeMember
$searchRemoveMember = <<<EOT
    public function removeMember(int \$requesterId, int \$canvasId, int \$targetUserId, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$requesterRole = \$this->canvasRepository->getMemberRole(\$canvasId, \$requesterId);
            \$isOwner = (\$canvas['owner_id'] === \$requesterId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (\$isOwner) \$requesterRole = 'admin';

            if (\$requesterRole !== 'admin') {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos de administrador en este lienzo.'];
            }

            if (\$canvas['owner_id'] === \$targetUserId) {
                return ['success' => false, 'message' => 'No puedes expulsar al creador original del lienzo.'];
            }

            \$removed = \$this->canvasRepository->removeMember(\$canvasId, \$targetUserId);
            if (\$removed) return ['success' => true, 'message' => 'Miembro expulsado correctamente.'];
            
            return ['success' => false, 'message' => 'No se pudo expulsar al miembro o ya no pertenece al lienzo.'];
        } catch (Exception \$e) {
            Logger::error('Error removing member.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }
EOT;

$replaceRemoveMember = <<<EOT
    public function removeMember(int \$requesterId, int \$canvasId, int \$targetUserId, bool \$canManageOfficial = false): array {
        try {
            \$canvas = \$this->canvasRepository->getById(\$canvasId);
            if (!\$canvas) return ['success' => false, 'message' => __('err_canvas_not_found') ?? 'Lienzo no encontrado.'];

            \$isOwner = (\$canvas['owner_id'] === \$requesterId) || (\$canvas['owner_id'] === null && \$canManageOfficial);
            if (!\$isOwner && !\$this->canvasRepository->hasCanvasPermission(\$canvasId, \$requesterId, 'manage_members')) {
                return ['success' => false, 'message' => __('err_unauthorized') ?? 'No tienes permisos para gestionar miembros en este lienzo.'];
            }

            if (\$canvas['owner_id'] === \$targetUserId) {
                return ['success' => false, 'message' => 'No puedes expulsar al creador original del lienzo.'];
            }
            
            // Peso validation
            if (!\$isOwner) {
                \$reqRoles = \$this->canvasRepository->getMemberRoles(\$canvasId, \$requesterId);
                \$reqMaxWeight = 0;
                foreach (\$reqRoles as \$rr) {
                    if (\$rr['weight'] > \$reqMaxWeight) \$reqMaxWeight = \$rr['weight'];
                }
                
                \$targetRoles = \$this->canvasRepository->getMemberRoles(\$canvasId, \$targetUserId);
                \$targetMaxWeight = 0;
                foreach (\$targetRoles as \$tr) {
                    if (\$tr['weight'] > \$targetMaxWeight) \$targetMaxWeight = \$tr['weight'];
                }
                
                if (\$targetMaxWeight >= \$reqMaxWeight) {
                    return ['success' => false, 'message' => 'No tienes permisos para expulsar a un usuario con un rol de igual o mayor jerarquía que el tuyo.'];
                }
            }

            \$removed = \$this->canvasRepository->removeMember(\$canvasId, \$targetUserId);
            if (\$removed) return ['success' => true, 'message' => 'Miembro expulsado correctamente.'];
            
            return ['success' => false, 'message' => 'No se pudo expulsar al miembro o ya no pertenece al lienzo.'];
        } catch (Exception \$e) {
            Logger::error('Error removing member.', ['error' => \$e->getMessage()]);
            return ['success' => false, 'message' => __('err_database') ?? 'Error interno del servidor.'];
        }
    }
EOT;

$content = str_replace($searchRemoveMember, $replaceRemoveMember, $content);


// Let's replace the handleAccessRequest method permission check
$content = preg_replace(
    '/\$role = \$this->canvasRepository->getMemberRole\(\$canvasId, \$userId\);\s*if \(\$role !== \'admin\'\) \{/',
    'if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, \'manage_members\')) {',
    $content
);

// getPendingRequests permission check
$content = preg_replace(
    '/\$memberRole = \$this->canvasRepository->getMemberRole\(\$canvasId, \$userId\);\s*if \(\$memberRole !== \'admin\'\) \{/',
    'if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, \'manage_members\')) {',
    $content
);

// getInvites permission check
$content = preg_replace(
    '/\$role = \$this->canvasRepository->getMemberRole\(\$canvasId, \$userId\);\s*if \(\$role !== \'admin\'\) \{/',
    'if (!$this->canvasRepository->hasCanvasPermission($canvasId, $userId, \'manage_settings\')) {',
    $content
);

// revokeInvite permission check
$content = preg_replace(
    '/\$role = \$this->canvasRepository->getMemberRole\(\$data\[\'canvas_id\'\], \$userId\);\s*if \(\$role !== \'admin\'\) \{/',
    'if (!$this->canvasRepository->hasCanvasPermission($data[\'canvas_id\'], $userId, \'manage_settings\')) {',
    $content
);

// joinViaInvite role usage
$content = preg_replace(
    '/\$added = \$this->canvasRepository->addMember\(\$canvasId, \$userId, \$invite\[\'role\'\]\);/',
    '$added = $this->canvasRepository->addMember($canvasId, $userId, (int)$invite[\'role\']);',
    $content
);

// deleteCanvas
$content = preg_replace(
    '/\$requesterRole = \$isOwner \? \'admin\' : \$this->canvasRepository->getMemberRole\(\$canvasId, \$userId\);\s*if \(\$requesterRole !== \'admin\'\) \{/',
    'if (!$isOwner) {',
    $content
);

// acceptAccessRequest role usage
$content = preg_replace(
    '/\$this->canvasRepository->addMember\(\$canvasId, \$request\[\'user_id\'\], \'editor\'\);/',
    '$this->canvasRepository->addMember($canvasId, $request[\'user_id\'], 1); // 1 = user default',
    $content
);

file_put_contents($filePath, $content);
echo "Refactor applied.\n";
