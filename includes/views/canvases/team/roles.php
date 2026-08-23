<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$rolesData = $canvasService->getCanvasRolesData($_GET['uuid'] ?? null);

if (!empty($rolesData['error'])) {
    if ($rolesData['error'] === __('err_plan_custom_roles')) {
        global $systemMessageType;
        $systemMessageType = 'subscription_required';
        require ROOT_PATH . '/includes/views/system/message.php';
        return;
    }
    if ($rolesData['error'] === __('err_canvas_not_found') || $rolesData['error'] === __('err_user_not_member')) {
        global $systemMessageType;
        $systemMessageType = '404';
        require ROOT_PATH . '/includes/views/system/message.php';
        return;
    }
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($rolesData);

if (!$canManageRoles) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>
<div class="view-content" data-ref="canvasRolesView" data-canvas-id="<?php echo $canvasId; ?>" data-canvas-uuid="<?php echo $canvasUuid; ?>" data-user-weight="<?php echo $userRolesWeight; ?>" data-is-owner="<?php echo $canvasOwnerId === $userId ? '1' : '0'; ?>">
    <div class="component-wrapper component-wrapper--full no-padding">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('canvas_roles_title'); ?></h1>
            </div>
            <div class="component-top-right">
                <div class="component-actions disabled" data-ref="role-selection-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="editRole" data-tooltip="<?php echo __('btn_edit'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    
                    <button class="component-button component-button--icon component-button--h40" data-action="editPermissions" data-tooltip="<?php echo __('btn_edit_permissions'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">admin_panel_settings</span>
                    </button>

                    <button class="component-button component-button--icon component-button--h40 component-button--danger" data-action="deleteRole" data-tooltip="<?php echo __('btn_delete'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
                
                <div class="component-actions active" data-ref="header-default-actions">
                    <button class="component-button component-button--icon component-button--h40" data-action="addRole" data-tooltip="<?php echo __('btn_add_role'); ?>" data-position="bottom">
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
                            data-role-uuid="<?php echo htmlspecialchars($role['uuid'] ?? ''); ?>"
                            data-role-name="<?php echo htmlspecialchars($translatedName); ?>" 
                            data-is-system="<?php echo $isSystemFlag; ?>" 
                            data-role-weight="<?php echo (int)$role['weight']; ?>">
                            <td>
                                <div class="td-user-info">
                                    <div class="component-badge component-badge--sm">
                                        <span class="material-symbols-rounded"><?php echo $isSystemFlag ? 'shield' : 'person'; ?></span>
                                        <span class="search-target"><?php echo $translatedName; ?></span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div class="component-badge component-badge--sm">
                                    <span class="material-symbols-rounded">layers</span>
                                    <span >
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
                <div class="component-empty-state-badge">
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                </div>
                <h2 class="component-empty-state-title"><?php echo __('empty_roles_title'); ?></h2>
                <p class="component-empty-state-desc"><?php echo __('empty_roles_desc'); ?></p>
            </div>
            <?php endif; ?>
        </div>

    </div>
</div>
