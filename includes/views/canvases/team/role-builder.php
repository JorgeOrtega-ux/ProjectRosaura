<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$roleBuilderData = $canvasService->getCanvasRoleBuilderData($_GET['uuid'] ?? null, isset($_GET['role_id']) ? (int)$_GET['role_id'] : null);

if (!empty($roleBuilderData['error'])) {
    echo "<div class='view-content'><p>".htmlspecialchars($roleBuilderData['error'])."</p></div>";
    return;
}

extract($roleBuilderData);
$isSystemRole = (isset($roleData['is_system']) && (int)$roleData['is_system'] === 1);

if (!$canManageRoles || ($isEdit && $roleData['weight'] >= $userRolesWeight && $canvasOwnerId !== $userId)) {
}

$appUrl = defined('APP_URL') ? APP_URL : '';
$backUrl = $appUrl . '/canvases/manage/roles/' . $canvasUuid;

$rawName = $roleData['name'] ?? '';
$translatedName = '';
if (trim($rawName) !== '') {
    if ($isSystemRole) {
        $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
        $translatedName = __($roleKey);
    } else {
        $translatedName = htmlspecialchars($rawName);
    }
}
?>

<div class="view-content" data-ref="canvasRoleBuilderView" data-canvas-id="<?php echo $canvasId; ?>" data-canvas-uuid="<?php echo $canvasUuid; ?>" data-role-id="<?php echo $roleData['id']; ?>" data-is-system="<?php echo $isSystemRole ? '1' : '0'; ?>" data-user-weight="<?php echo $userRolesWeight; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title" data-ref="builderTitle"><?php echo $isEdit ? __('admin_edit_role') : __('admin_role_builder'); ?></h1>
            <?php if ($isSystemRole): ?>
            <h1 class="component-top-title" data-ref="systemIndicator"><?php echo __('admin_role_system_limited_edit'); ?></h1>
            <?php endif; ?>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--primary component-button--h40" data-action="saveRoleData">
                <span class="material-symbols-rounded">save</span>
                <?php echo __('btn_save_changes'); ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div class="component-card--grouped">
                    
                    <div class="component-group-item component-group-item--stateful">
                        <div class="active component-state-box" data-state="role-name-view" data-ref="roleNameView">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_role_name'); ?></h2>
                                    <span class="component-display-value" data-ref="display-role-name">
                                        <?php echo $translatedName !== '' ? htmlspecialchars($translatedName) : __('admin_role_undefined'); ?>
                                    </span>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--stretch">
                                <button type="button" class="component-button component-button--h34 <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>" data-action="toggleEditState" data-target="role-name"><?php echo __('btn_edit'); ?></button>
                            </div>
                        </div>

                        <div class="disabled component-state-box" data-state="role-name-edit" data-ref="roleNameEdit">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_role_name'); ?></h2>
                                    <div class="component-edit-row">
                                        <div class="component-input-group component-input-group--h34">
                                            <input type="text" data-ref="roleNameInput" class="component-input-field component-input-field--simple" placeholder="<?php echo __('ph_role_moderator'); ?>" value="<?php echo htmlspecialchars($roleData['name']); ?>" <?php echo $isSystemRole ? 'disabled' : ''; ?>>
                                        </div>
                                        <div class="component-card__actions component-card__actions--stretch">
                                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="role-name"><?php echo __('btn_cancel'); ?></button>
                                            <button type="button" class="component-button component-button--h34 component-button--dark <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>" data-action="applyRoleName"><?php echo __('btn_save'); ?></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content">
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('admin_role_hierarchy_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('admin_role_hierarchy_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--start">
                            <div class="component-inline-control component-inline-control--fixed <?php echo $isSystemRole ? 'disabled-interaction' : ''; ?>">
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="-5" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="-1" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                </div>
                                <div class="component-inline-control__center" data-ref="val_role_weight" data-val="<?php echo (int)$roleData['weight']; ?>"><?php echo (int)$roleData['weight']; ?></div>
                                <div class="component-inline-control__group">
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="1" data-max="99"><span class="material-symbols-rounded">chevron_right</span></button>
                                    <button type="button" class="component-inline-control__btn" data-action="adjustWeight" data-step="5" data-max="99"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </div>
</div>
