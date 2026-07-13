<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\Database\DatabaseManager;
use App\Core\Helpers\Utils;
use PDO;

$userId = $_SESSION['active_account_id'] ?? $_SESSION['user_id'] ?? null;
$canvasUuid = isset($_GET['uuid']) ? $_GET['uuid'] : null;

if (!$userId || !$canvasUuid) {
    echo "<div class='view-content'><p>".__('err_unauthorized_or_missing_id')."</p></div>";
    return;
}

$db = new DatabaseManager();
$connNameCanvases = defined('App\Core\System\DatabaseConstants::CONN_CANVASES') ? App\Core\System\DatabaseConstants::CONN_CANVASES : 'canvases';
$pdoCanvases = $db->getConnection($connNameCanvases);

$canvasId = null;
$canvasOwnerId = null;
try {
    $stmt = $pdoCanvases->prepare("SELECT id, owner_id FROM canvases WHERE uuid = :uuid LIMIT 1");
    $stmt->execute(['uuid' => $canvasUuid]);
    $canvasData = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($canvasData) {
        $canvasId = (int)$canvasData['id'];
        $canvasOwnerId = (int)$canvasData['owner_id'];
    }
} catch (\Exception $e) {}

if (!$canvasId) {
    echo "<div class='view-content'><p>".__('err_canvas_not_found')."</p></div>";
    return;
}

$roles = [];
try {
    $stmt = $pdoCanvases->prepare("SELECT * FROM canvas_roles WHERE canvas_id IS NULL OR canvas_id = :cid ORDER BY weight DESC");
    $stmt->execute(['cid' => $canvasId]);
    $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (\Exception $e) {}
$userRolesWeight = 0;
$canManageRoles = ($canvasOwnerId === $userId);

if (!$canManageRoles) {
    try {
        $stmtRole = $pdoCanvases->prepare("SELECT r.weight FROM canvas_roles r JOIN canvas_user_roles ur ON r.id = ur.role_id WHERE ur.canvas_id = :cid AND ur.user_id = :uid ORDER BY r.weight DESC LIMIT 1");
        $stmtRole->execute(['cid' => $canvasId, 'uid' => $userId]);
        $w = $stmtRole->fetchColumn();
        if ($w !== false) $userRolesWeight = (int)$w;
        
        $stmtPerm = $pdoCanvases->prepare("SELECT 1 FROM canvas_role_permissions rp JOIN canvas_permissions p ON rp.permission_id = p.id JOIN canvas_user_roles ur ON rp.role_id = ur.role_id WHERE ur.canvas_id = :cid AND ur.user_id = :uid AND p.name = 'manage_roles' LIMIT 1");
        $stmtPerm->execute(['cid' => $canvasId, 'uid' => $userId]);
        if ($stmtPerm->fetchColumn()) {
            $canManageRoles = true;
        }
    } catch (\Exception $e) {}
} else {
    $userRolesWeight = 100;
}

if (!$canManageRoles) {
    echo "<div class='view-content'><p>".__('err_no_permission')."</p></div>";
    return;
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>
<div class="view-content" data-ref="canvasRolesView" data-canvas-id="<?php echo $canvasId; ?>" data-canvas-uuid="<?php echo $canvasUuid; ?>" data-user-weight="<?php echo $userRolesWeight; ?>" data-is-owner="<?php echo $canvasOwnerId === $userId ? '1' : '0'; ?>">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvas_roles_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="role-selection-actions">
                    <button class="component-button component-button--secondary component-button--icon component-button--h40" data-action="editRole" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    
                    <button class="component-button component-button--secondary component-button--icon component-button--h40" data-action="editPermissions" data-tooltip="<?php echo __('btn_edit_permissions'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">admin_panel_settings</span>
                    </button>

                    <button class="component-button component-button--danger component-button--icon component-button--h40" data-action="deleteRole" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40" data-action="deselectRole" data-tooltip="<?php echo __('tooltip_cancel_selection'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--primary component-button--icon component-button--h40" data-action="addRole" data-tooltip="<?php echo __('btn_add_role'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="component-bottom">
            <?php if ($roles && count($roles) > 0): ?>
            <div class="component-table-wrapper" data-ref="roles-table-wrapper">
                <table class="component-table">
                    <thead>
                        <tr>
                            <th><?php echo __('admin_roles_col_system_role'); ?></th>
                            <th data-width="120"><?php echo __('admin_roles_col_hierarchy'); ?></th>
                            <th data-width="180"><?php echo __('lbl_type'); ?></th>
                        </tr>
                    </thead>
                    <tbody data-ref="roles-table-body">
                        <?php foreach ($roles as $role): 
                            $rawName = $role['name'] ?? '';
                            $isSystemFlag = isset($role['is_system']) ? (int)$role['is_system'] : 0;
                            if ($isSystemFlag) {
                                $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
                                $translatedName = __($roleKey);
                            } else {
                                $translatedName = htmlspecialchars($rawName);
                            }
                        ?>
                        <tr class="component-table-row clickable" 
                            data-action="selectRoleRow" 
                            data-role-id="<?php echo $role['id']; ?>" 
                            data-role-name="<?php echo htmlspecialchars($translatedName); ?>" 
                            data-is-system="<?php echo $isSystemFlag; ?>" 
                            data-role-weight="<?php echo (int)$role['weight']; ?>">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded"><?php echo $isSystemFlag ? 'shield' : 'person'; ?></span>
                                        <span class="search-target font-medium"><?php echo $translatedName; ?></span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">layers</span>
                                    <span class="font-mono font-medium">
                                        <?php echo (int)$role['weight']; ?>
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded"><?php echo $isSystemFlag ? 'lock' : 'edit'; ?></span>
                                    <span><?php echo $isSystemFlag ? __('lbl_default') : __('lbl_custom'); ?></span>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php else: ?>
            <div class="component-empty-state" data-ref="roles-empty-state">
                <span class="material-symbols-rounded empty-icon">admin_panel_settings</span>
                <h3><?php echo __('empty_roles_title'); ?></h3>
                <p><?php echo __('empty_roles_desc'); ?></p>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>
