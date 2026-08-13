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
        <h2 class="component-modal-title"><?php echo __('modal_manage_user_roles_title'); ?></h2>
        <p class="component-modal-desc"><?php echo __('modal_manage_user_roles_desc'); ?> <b><?php echo htmlspecialchars($user['username']); ?></b>.</p>
    </div>
</div>

<div class="component-modal-body" data-ref="admin-roles-form" data-target-user-id="<?php echo htmlspecialchars((string)$targetUserId); ?>">
    
    <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
        <div class="component-dropdown-trigger component-dropdown-trigger--space-between" data-action="toggleModule" data-target="dropdownRolesList">
            <div class="component-dropdown-trigger-title">
                <span class="material-symbols-rounded">admin_panel_settings</span>
                <span class="component-dropdown-text" data-ref="roles-dropdown-text"><?php echo __('lbl_select_roles'); ?></span>
            </div>
            <span class="material-symbols-rounded">expand_more</span>
        </div>

        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--dropdown-full component-module--spaced disabled" data-module="dropdownRolesList">
            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-menu-header">
                    <div class="component-menu-header-box">
                        <span class="component-menu-header-title"><?php echo __('lbl_available_roles'); ?></span>
                    </div>
                </div>
                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact component-menu-list--max-h250">
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
                    
                    <label class="component-menu-link component-menu-link--bordered component-menu-link-role <?php echo $disabledClass; ?>">
                        <div class="component-menu-link-role-main">
                            <input type="checkbox" name="assigned_roles[]" value="<?php echo htmlspecialchars((string)$r['id']); ?>" class="admin-role-checkbox" <?php echo $isChecked; ?> <?php echo $isDisabled ? 'disabled' : ''; ?>>
                            <div class="component-menu-link-role-info">
                                <span class="component-menu-link-role-name"><?php echo htmlspecialchars($rTrans); ?></span>
                                <span class="component-menu-link-role-desc" title="<?php echo htmlspecialchars($rDescTrans); ?>"><?php echo htmlspecialchars($rDescTrans); ?></span>
                            </div>
                        </div>
                        <div class="component-menu-link-role-badges">
                            <?php if($r['id'] == 1): ?> 
                                <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> <?php echo __('lbl_base'); ?></span> 
                            <?php endif; ?>
                            <?php if ($r['id'] == 4): ?>
                                <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> <?php echo __('lbl_unavailable'); ?></span>
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
