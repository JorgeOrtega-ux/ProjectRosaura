<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$changeRoleData = $canvasService->getCanvasChangeRoleData($_GET['uuid'] ?? null, $_GET['user_uuid'] ?? null);

if (!empty($changeRoleData['error'])) {
    if ($changeRoleData['error'] === __('err_plan_custom_roles')) {
        $systemMessageType = 'subscription_required';
        require ROOT_PATH . '/includes/views/system/message.php';
        return;
    }
    if ($changeRoleData['error'] === __('err_canvas_not_found') || $changeRoleData['error'] === __('err_user_not_member')) {
        $systemMessageType = '404';
        require ROOT_PATH . '/includes/views/system/message.php';
        return;
    }
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($changeRoleData);
?>

<div class="view-content" data-ref="change-role-wrapper" 
     data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>"
     data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>"
     data-target-user-id="<?php echo htmlspecialchars($targetUserId); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('lbl_manage_role') . ': ' . htmlspecialchars($targetUsername); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40" data-action="cancelRole" data-tooltip="<?php echo __('btn_cancel'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">close</span>
            </button>
            <button class="component-button component-button--icon component-button--h40" data-action="saveRole" data-tooltip="<?php echo __('btn_save_changes'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <?php if ($isOwner): ?>
                <div>
                    <span class="material-symbols-rounded">info</span>
                    <span><?php echo __('msg_owner_role_warning'); ?></span>
                </div>
                <?php endif; ?>

                <div data-ref="admin-roles-form">
                    <div class="component-card--grouped">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_select_new_role'); ?></h2>
                                    <p class="component-card__description" data-ref="admin-role-desc">
                                        <?php echo __('desc_manage_role'); ?>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <hr class="component-divider">

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
                        <div class="component-group-item component-group-item--wrap">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title">
                                        <?php echo $translatedName; ?>
                                        <span class="material-symbols-rounded" title="Hierarchy: <?php echo $role['weight']; ?>"><?php echo $isSystemFlag ? 'shield' : 'person'; ?></span>
                                    </h2>
                                    <p class="component-card__description"><?php echo htmlspecialchars($desc); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch">
                                    <input type="checkbox" name="new_member_roles[]" value="<?php echo $role['id']; ?>" <?php echo $isChecked; ?> class="admin-role-checkbox">
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        <hr class="component-divider">
                        <?php endforeach; ?>

                    </div>
                </div>

            </div>
        </div>
    </div>
</div>