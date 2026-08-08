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
            <h2 class="component-modal-title">Error</h2>
            <p class="component-modal-desc"><?php echo htmlspecialchars($changeRoleData['error']); ?></p>
        </div>
    </div>
    <div class="component-modal-actions">
        <button class="component-button component-button--h40" data-modal-action="cancel"><?php echo __('btn_close') ?: 'Cerrar'; ?></button>
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
        <p class="component-modal-desc">Modifica los roles del miembro del equipo en este lienzo.</p>
    </div>
</div>

<div class="component-modal-body" data-ref="change-role-wrapper" 
     data-canvas-id="<?php echo htmlspecialchars((string)$canvasId); ?>"
     data-canvas-uuid="<?php echo htmlspecialchars((string)$canvasUuid); ?>"
     data-target-user-id="<?php echo htmlspecialchars((string)$targetUserId); ?>">

    <?php if ($isOwner): ?>
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 10px; background: rgba(var(--warning-rgb), 0.1); border-radius: 6px; color: var(--warning-color);">
        <span class="material-symbols-rounded">info</span>
        <span style="font-size: 13px;"><?php echo __('msg_owner_role_warning'); ?></span>
    </div>
    <?php endif; ?>

    <div class="component-dropdown-wrapper component-dropdown-wrapper--fit" style="width: 100%;">
        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="dropdownCanvasRolesList" style="width: 100%; justify-content: space-between; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-rounded">shield</span>
                <span class="component-dropdown-text">Seleccionar Roles de Lienzo</span>
            </div>
            <span class="material-symbols-rounded">expand_more</span>
        </div>

        <div class="component-module component-module--dropdown component-module--dropdown-fixed component-module--spaced disabled" data-module="dropdownCanvasRolesList" style="width: 100%; left: 0; box-sizing: border-box;">
            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding">
                <div class="pill-container"><div class="drag-handle"></div></div>
                <div class="component-menu-header">
                    <div class="component-menu-header-box">
                        <span class="component-menu-header-title">Roles del Lienzo</span>
                    </div>
                </div>
                <div class="component-menu-list component-menu-list--scrollable component-menu-list--compact" style="max-height: 250px; overflow-y: auto;">
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
                    ?>
                    <label class="component-menu-link component-menu-link--bordered" style="display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                            <input type="checkbox" name="new_member_roles[]" value="<?php echo htmlspecialchars((string)$role['id']); ?>" class="admin-role-checkbox" <?php echo $isChecked; ?>>
                            <div style="display: flex; flex-direction: column; min-width: 0;">
                                <span style="font-weight: 500; font-size: 14px;"><?php echo htmlspecialchars($translatedName); ?></span>
                                <span style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="<?php echo htmlspecialchars($desc); ?>"><?php echo htmlspecialchars($desc); ?></span>
                            </div>
                        </div>
                        <span class="material-symbols-rounded" style="color: var(--text-muted);" title="Jerarquía: <?php echo $role['weight']; ?>"><?php echo $isSystemFlag ? 'shield' : 'person'; ?></span>
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
