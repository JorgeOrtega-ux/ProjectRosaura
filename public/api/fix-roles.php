<?php
require __DIR__ . '/../../includes/core/bootstrap.php';

use App\Config\DatabaseManager;

try {
    $db = new DatabaseManager();
    $connNameCanvases = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
    $pdo = $db->getConnection($connNameCanvases);

    // Get all canvases that DO NOT have any roles in canvas_roles
    $stmt = $pdo->query("SELECT id, owner_id FROM canvases WHERE id NOT IN (SELECT DISTINCT canvas_id FROM canvas_roles)");
    $canvases = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($canvases) . " canvases missing roles.\n";

    $pdo->beginTransaction();

    foreach ($canvases as $canvas) {
        $canvasId = (int)$canvas['id'];
        
        // 1. Create Admin Role
        $stmtAdmin = $pdo->prepare("INSERT INTO canvas_roles (canvas_id, name, weight, is_system) VALUES (?, 'desc_role_admin', 100, 1)");
        $stmtAdmin->execute([$canvasId]);
        $adminRoleId = (int)$pdo->lastInsertId();

        // Admin Permissions
        $adminPerms = ['place_pixels', 'manage_settings', 'manage_members', 'manage_roles', 'assign_roles', 'view_history', 'manage_resets'];
        foreach ($adminPerms as $perm) {
            $stmtPerm = $pdo->prepare("SELECT id FROM canvas_permissions WHERE name = ?");
            $stmtPerm->execute([$perm]);
            $permId = $stmtPerm->fetchColumn();
            if ($permId) {
                $pdo->prepare("INSERT INTO canvas_role_permissions (role_id, permission_id) VALUES (?, ?)")->execute([$adminRoleId, $permId]);
            }
        }

        // 2. Create Editor Role
        $stmtEditor = $pdo->prepare("INSERT INTO canvas_roles (canvas_id, name, weight, is_system) VALUES (?, 'desc_role_editor', 50, 1)");
        $stmtEditor->execute([$canvasId]);
        $editorRoleId = (int)$pdo->lastInsertId();

        // Editor Permissions
        $editorPerms = ['place_pixels', 'view_history'];
        foreach ($editorPerms as $perm) {
            $stmtPerm = $pdo->prepare("SELECT id FROM canvas_permissions WHERE name = ?");
            $stmtPerm->execute([$perm]);
            $permId = $stmtPerm->fetchColumn();
            if ($permId) {
                $pdo->prepare("INSERT INTO canvas_role_permissions (role_id, permission_id) VALUES (?, ?)")->execute([$editorRoleId, $permId]);
            }
        }

        // 3. Create Viewer Role
        $stmtViewer = $pdo->prepare("INSERT INTO canvas_roles (canvas_id, name, weight, is_system) VALUES (?, 'desc_role_viewer', 10, 1)");
        $stmtViewer->execute([$canvasId]);
        $viewerRoleId = (int)$pdo->lastInsertId();

        // Viewer Permissions
        $viewerPerms = ['view_history'];
        foreach ($viewerPerms as $perm) {
            $stmtPerm = $pdo->prepare("SELECT id FROM canvas_permissions WHERE name = ?");
            $stmtPerm->execute([$perm]);
            $permId = $stmtPerm->fetchColumn();
            if ($permId) {
                $pdo->prepare("INSERT INTO canvas_role_permissions (role_id, permission_id) VALUES (?, ?)")->execute([$viewerRoleId, $permId]);
            }
        }

        // Assign Admin role to the owner if they are a member
        $ownerId = $canvas['owner_id'] !== null ? (int)$canvas['owner_id'] : null;
        if ($ownerId !== null) {
            // Force add them as a member first just in case
            $stmtAddMem = $pdo->prepare("INSERT IGNORE INTO canvas_members (canvas_id, user_id) VALUES (?, ?)");
            $stmtAddMem->execute([$canvasId, $ownerId]);

            $stmtAssign = $pdo->prepare("INSERT IGNORE INTO canvas_user_roles (canvas_id, user_id, role_id) VALUES (?, ?, ?)");
            $stmtAssign->execute([$canvasId, $ownerId, $adminRoleId]);
        }
    }

    $pdo->commit();
    echo "Fixed roles successfully.\n";
} catch (\Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage() . "\n";
}
