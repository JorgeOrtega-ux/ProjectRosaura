<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$changeRoleData = $canvasService->getCanvasChangeRoleData($_GET['uuid'] ?? null, $_GET['user_uuid'] ?? null);

if (!empty($changeRoleData['error'])) {
    ?>
    <div class="component-modal-header component-modal-header--with-icon">
        <div class="component-card__icon-container component-card__icon-container--bordered">
            <span class="material-symbols-rounded">warning</span>
        </div>
        <div class="component-modal-header-text">
            <h2 class="component-modal-title"><?php echo __('lbl_error'); ?></h2>
            <p class="component-modal-desc"><?php echo htmlspecialchars($changeRoleData['error']); ?></p>
        </div>
    </div>
    <div class="component-modal-actions">
        <button class="component-button component-button--h40" data-modal-action="cancel"><?php echo __('btn_close'); ?></button>
    </div>
    <?php
    return;
}

extract($changeRoleData);
?>
<div class="component-modal-header component-modal-header--with-icon">
    <div class="component-card__icon-container component-card__icon-container--bordered">
        <span class="material-symbols-rounded">manage_accounts</span>
    </div>
    <div class="component-modal-header-text">
        <h2 class="component-modal-title"><?php echo __('lbl_manage_role') . ': ' . htmlspecialchars($targetUsername); ?></h2>
        <p class="component-modal-desc"><?php echo __('modal_change_canvas_role_desc'); ?></p>
    </div>
</div>

<div class="component-modal-body" data-ref="change-role-wrapper" 
     data-canvas-id="<?php echo htmlspecialchars((string)$canvasId); ?>"
     data-canvas-uuid="<?php echo htmlspecialchars((string)$canvasUuid); ?>"
     data-target-user-id="<?php echo htmlspecialchars((string)$targetUserId); ?>">

    <?php if ($isOwner): ?>
    <div class="component-alert component-alert--warning">
        <span class="material-symbols-rounded">info</span>
        <span class="component-alert-text"><?php echo __('msg_owner_role_warning'); ?></span>
    </div>
    <?php endif; ?>

    <div class="component-dropdown-wrapper component-dropdown-wrapper--w-full">
        <div class="component-dropdown-trigger component-dropdown-trigger--space-between" data-action="toggleModule" data-target="dropdownCanvasRolesList">
            <div class="component-dropdown-trigger-title">
                <span class="material-symbols-rounded">shield</span>
                <span class="component-dropdown-text"><?php echo __('lbl_select_canvas_roles'); ?></span>
            </div>
            <span class="material-symbols-rounded">expand_more</span>
        </div>

        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--dropdown-full component-module--spaced disabled" data-module="dropdownCanvasRolesList">
            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-menu-header">
                    <div class="component-menu-header-box">
                        <span class="component-menu-header-title"><?php echo __('lbl_available_canvas_roles'); ?></span>
                    </div>
                </div>
                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact component-menu-list--max-h250">
                    <?php foreach ($availableRoles as $role): 
                        $rawName = $role['name'];
                        $isSystemFlag = $role['is_system'] ?? 0;
                        if ($isSystemFlag) {
                            $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
                            $translatedName = __($roleKey);
                            $desc = __('desc_role_' . strtolower(trim($rawName)));
                        } else {
                            $translatedName = htmlspecialchars($rawName);
                            $desc = __('lbl_custom_role_weight') . ' ' . $role['weight'];
                        }
                        
                        $isChecked = in_array((int)$role['id'], $targetCurrentRoles ?? []) ? 'checked' : '';
                        
                        $isHigherHierarchy = !$isRequesterOwner && (int)$role['weight'] >= $userRolesWeight;
                        $isSuperAdminRole = (int)$role['id'] === 4 || (int)$role['weight'] >= 100;
                        $isDisabled = ($isHigherHierarchy || ($isSuperAdminRole && !$isRequesterOwner));
                        $disabledClass = $isDisabled ? 'disabled-interaction' : '';
                    ?>
                    <label class="component-menu-link component-menu-link--bordered component-menu-link-role <?php echo $disabledClass; ?>">
                        <div class="component-menu-link-role-main">
                            <input type="checkbox" name="new_member_roles[]" value="<?php echo htmlspecialchars((string)$role['id']); ?>" class="admin-role-checkbox" <?php echo $isChecked; ?> <?php echo $isDisabled ? 'disabled' : ''; ?>>
                            <div class="component-menu-link-role-info">
                                <span class="component-menu-link-role-name"><?php echo htmlspecialchars($translatedName); ?></span>
                                <span class="component-menu-link-role-desc" title="<?php echo htmlspecialchars($desc); ?>"><?php echo htmlspecialchars($desc); ?></span>
                            </div>
                        </div>
                        <div class="component-menu-link-role-badges">
                            <?php if ($isDisabled): ?>
                                <span class="component-badge component-badge--sm"><span class="material-symbols-rounded">lock</span> <?php echo __('lbl_unavailable'); ?></span>
                            <?php endif; ?>
                            <span class="material-symbols-rounded" title="<?php echo __('lbl_hierarchy') . ': ' . $role['weight']; ?>"><?php echo $isSystemFlag ? 'shield' : 'person'; ?></span>
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
    <button class="component-button component-button--h40 component-button--dark" data-action="saveCanvasMemberRoleSubmit"><?php echo __('btn_save_changes'); ?></button>
</div>
