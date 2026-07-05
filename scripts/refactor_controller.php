<?php
$filePath = __DIR__ . '/../api/controllers/CanvasController.php';
$content = file_get_contents($filePath);

// Rename change_member_role to assign_member_role
$content = preg_replace(
    '/public function change_member_role\(\$request\)/',
    'public function assign_member_role($request)',
    $content
);

$content = preg_replace(
    '/\$result = \$this->canvasServices->changeMemberRole\(\$userId, \(int\)\$canvasId, \(int\)\$targetUserId, \$newRole, \$this->canManageOfficial\(\)\);/',
    '$result = $this->canvasServices->assignMemberRole($userId, (int)$canvasId, (int)$targetUserId, (int)$newRole, $this->canManageOfficial());',
    $content
);

// Add the new methods
$newMethods = <<<EOT

    public function get_roles(\$request) {
        if (!\$this->session->isLoggedIn()) return ['success' => false, 'message' => __('err_unauthorized')];
        \$userId = \$this->session->getActiveAccountId();
        \$canvasId = \$request['canvas_id'] ?? null;
        if (!\$canvasId) return ['success' => false, 'message' => 'Lienzo no especificado.'];
        
        \$result = \$this->canvasServices->getCanvasRoles(\$userId, (int)\$canvasId, \$this->canManageOfficial());
        return \$result;
    }

    public function get_permissions(\$request) {
        if (!\$this->session->isLoggedIn()) return ['success' => false, 'message' => __('err_unauthorized')];
        \$userId = \$this->session->getActiveAccountId();
        \$canvasId = \$request['canvas_id'] ?? null;
        if (!\$canvasId) return ['success' => false, 'message' => 'Lienzo no especificado.'];
        
        \$result = \$this->canvasServices->getCanvasPermissions(\$userId, (int)\$canvasId, \$this->canManageOfficial());
        return \$result;
    }

    public function create_role(\$request) {
        if (!\$this->session->isLoggedIn()) return ['success' => false, 'message' => __('err_unauthorized')];
        \$userId = \$this->session->getActiveAccountId();
        
        \$canvasId = \$request['canvas_id'] ?? null;
        \$name = \$request['name'] ?? null;
        \$permissions = \$request['permissions'] ?? [];
        
        if (!\$canvasId || !\$name) return ['success' => false, 'message' => 'Faltan parámetros obligatorios.'];
        
        \$result = \$this->canvasServices->createCanvasRole(\$userId, (int)\$canvasId, \$name, \$permissions, \$this->canManageOfficial());
        return \$result;
    }

    public function update_role(\$request) {
        if (!\$this->session->isLoggedIn()) return ['success' => false, 'message' => __('err_unauthorized')];
        \$userId = \$this->session->getActiveAccountId();
        
        \$roleId = \$request['role_id'] ?? null;
        \$canvasId = \$request['canvas_id'] ?? null;
        \$name = \$request['name'] ?? null;
        \$permissions = \$request['permissions'] ?? [];
        
        if (!\$roleId || !\$canvasId || !\$name) return ['success' => false, 'message' => 'Faltan parámetros obligatorios.'];
        
        \$result = \$this->canvasServices->updateCanvasRole(\$userId, (int)\$roleId, (int)\$canvasId, \$name, \$permissions, \$this->canManageOfficial());
        return \$result;
    }

    public function delete_role(\$request) {
        if (!\$this->session->isLoggedIn()) return ['success' => false, 'message' => __('err_unauthorized')];
        \$userId = \$this->session->getActiveAccountId();
        
        \$roleId = \$request['role_id'] ?? null;
        \$canvasId = \$request['canvas_id'] ?? null;
        
        if (!\$roleId || !\$canvasId) return ['success' => false, 'message' => 'Faltan parámetros obligatorios.'];
        
        \$result = \$this->canvasServices->deleteCanvasRole(\$userId, (int)\$roleId, (int)\$canvasId, \$this->canManageOfficial());
        return \$result;
    }
EOT;

$content = preg_replace('/}(?=[^}]*$)/', $newMethods . "\n}", $content);

file_put_contents($filePath, $content);
echo "Controller refactored.\n";
