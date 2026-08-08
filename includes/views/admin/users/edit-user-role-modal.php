<?php
use App\Api\Services\Admin\AdminViewService;

$adminService = new AdminViewService();
$roleData = $adminService->getEditUserRoleData($_GET['uuid'] ?? '');

if (!empty($roleData['redirect'])) {
    return;
}

extract($roleData);
$user = $targetUser;
$assignedRoleIds = $currentUserRoleId !== null ? [$currentUserRoleId] : [];
$isSuperAdmin = isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4;
$isTargetSuperAdmin = in_array(4, $assignedRoleIds);
?>
<div class="component-modal-header component-modal-header--with-icon">
    <div class="component-card__icon-container component-card__icon-container--bordered">
        <span class="material-symbols-rounded">shield_person</span>
    </div>
    <div class="component-modal-header-text">
        <h2 class="component-modal-title">Gestión de Roles de Usuario</h2>
        <p class="component-modal-desc">Modifica los roles de acceso y jerarquía de permisos para el usuario <b><?php echo htmlspecialchars($user['username']); ?></b>.</p>
    </div>
</div>

<div class="component-modal-body" data-ref="admin-roles-form" data-target-user-id="<?php echo htmlspecialchars((string)$targetUserId); ?>">
    
    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit" style="width: 100%;">
        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownRolesList" style="width: 100%; justify-content: space-between; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-rounded">admin_panel_settings</span>
                <span class="component-dropdown-text" data-ref="roles-dropdown-text">Seleccionar Roles</span>
            </div>
            <span class="material-symbols-rounded">expand_more</span>
        </div>

        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="dropdownRolesList" style="width: 100%; left: 0; box-sizing: border-box;">
            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-menu-header">
                    <div class="component-menu-header-box">
                        <span class="component-menu-header-title">Roles Disponibles</span>
                    </div>
                </div>
                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact" style="max-height: 250px; overflow-y: auto;">
                    <?php 
                    foreach ($allRoles as $index => $r): 
                        $rKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($r['name'])));
                        $rTrans = __($rKey);

                        $rDescKey = 'role_desc.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($r['name'])));
                        $rDescTrans = __($rDescKey);

                        $isHigherHierarchy = !$isSuperAdmin && (int)$r['weight'] >= $currentUserWeight;
                        $isDisabled = ($r['id'] == 4 || $isHigherHierarchy || $r['id'] == 1 || $isTargetSuperAdmin) ? true : false;
                        
                        $isChecked = in_array($r['id'], $assignedRoleIds) ? 'checked' : '';
                        $disabledClass = $isDisabled ? 'disabled-interaction' : '';
                    ?>
                    
                    <label class="component-menu-link component-menu-link--bordered <?php echo $disabledClass; ?>" style="display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; cursor: <?php echo $isDisabled ? 'not-allowed' : 'pointer'; ?>;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                            <input type="checkbox" name="assigned_roles[]" value="<?php echo htmlspecialchars($r['id']); ?>" class="admin-role-checkbox" <?php echo $isChecked; ?> <?php echo $isDisabled ? 'disabled' : ''; ?> style="pointer-events: auto;">
                            <div style="display: flex; flex-direction: column; min-width: 0;">
                                <span style="font-weight: 500; font-size: 14px;"><?php echo htmlspecialchars($rTrans); ?></span>
                                <span style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="<?php echo htmlspecialchars($rDescTrans); ?>"><?php echo htmlspecialchars($rDescTrans); ?></span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <?php if($r['id'] == 1): ?> 
                                <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> Base</span> 
                            <?php endif; ?>
                            <?php if ($r['id'] == 4): ?>
                                <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> No disponible</span>
                            <?php endif; ?>
                        </div>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="component-modal-actions">
    <button class="component-button component-button--h40" data-modal-action="cancel"><?php echo __('btn_cancel'); ?></button>
    <button class="component-button component-button--h40 component-button--dark" data-action="submitMultipleRolesUpdate"><?php echo __('btn_save_changes'); ?></button>
</div>
