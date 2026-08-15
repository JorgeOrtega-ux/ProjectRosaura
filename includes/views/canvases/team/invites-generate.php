<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$invitesData = $canvasService->getCanvasInvitesData($_GET['uuid'] ?? null);

if (!empty($invitesData['error'])) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($invitesData);

$rolesData = $canvasService->getCanvasRolesData($canvasUuid);
$availableRoles = $rolesData['roles'] ?? [];

$defaultRole = null;
if (!empty($availableRoles)) {
    foreach ($availableRoles as $r) {
        if (strtolower($r['name']) === 'viewer') {
            $defaultRole = $r;
            break;
        }
    }
    if (!$defaultRole) {
        $defaultRole = end($availableRoles);
    }
}

$appUrl = defined('APP_URL') ? APP_URL : '';
?>

<div class="view-content" data-ref="manage-invites-generate-wrapper" data-canvas-id="<?php echo htmlspecialchars($canvasId); ?>" data-canvas-uuid="<?php echo htmlspecialchars($canvasUuid); ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('lbl_generate_new_invite'); ?></h1>
        </div>
        <div class="component-top-right">
            <button type="button" class="component-button component-button--h40" data-action="submitGenerateInvite">
                <span class="material-symbols-rounded">add_link</span>
                <?php echo __('btn_generate_invite'); ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                <div data-ref="form-generate-invite" class="component-form">
                    <div class="component-card--grouped">
                        
                                                <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_role_to_grant'); ?></h2>
                                    <p class="component-card__description"><?php echo __('desc_invite_role'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-dropdown-wrapper">
                                    <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleRole">
                                        <?php 
                                            $defIcon = ($defaultRole['is_system'] ?? 0) ? 'shield' : 'person';
                                            $defLabel = $defaultRole['name'] ?? __('lbl_select');
                                            if ($defaultRole && ($defaultRole['is_system'] ?? 0)) {
                                                $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($defLabel)));
                                                $translatedName = __($roleKey);
                                                if ($translatedName !== $roleKey) $defLabel = $translatedName;
                                            }
                                        ?>
                                        <span class="material-symbols-rounded" data-ref="icon-role"><?php echo $defIcon; ?></span>
                                        <span class="component-dropdown-text" data-ref="text-role"><?php echo htmlspecialchars($defLabel); ?></span>
                                        <span class="material-symbols-rounded">expand_more</span>
                                    </div>
                                    <div class="component-module component-module--dropdown disabled" data-module="moduleRole">
                                        <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--limited">
                                            <div class="pill-container"><div class="drag-handle"></div></div>
                                            <div class="component-menu-list">
                                                <?php foreach ($availableRoles as $role): 
                                                    $rawName = $role['name'];
                                                    $isSystemFlag = $role['is_system'] ?? 0;
                                                    $icon = $isSystemFlag ? 'shield' : 'person';
                                                    if ($isSystemFlag) {
                                                        $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
                                                        $translatedName = __($roleKey);
                                                    } else {
                                                        $translatedName = htmlspecialchars($rawName);
                                                    }
                                                    $nameLower = strtolower(trim($rawName));
                                                    $isHighRole = in_array($nameLower, ['owner', 'propietario', 'superadmin', 'superadministrador']) || (isset($role['weight']) && (int)$role['weight'] >= 100);
                                                    
                                                    $isActive = ($defaultRole && $defaultRole['id'] == $role['id']) ? 'active' : '';
                                                    $isDisabled = $isHighRole ? 'disabled-interaction' : '';
                                                ?>
                                                    <div class="component-menu-link <?php echo $isActive . ' ' . $isDisabled; ?>" data-action="selectInviteRole" data-value="<?php echo htmlspecialchars($role['id']); ?>" data-label="<?php echo htmlspecialchars($translatedName); ?>" data-icon="<?php echo $icon; ?>" <?php if($isHighRole) echo 'data-tooltip="' . htmlspecialchars(__('err_cannot_generate_invite_role')) . '" data-position="right"'; ?>>
                                                        <div class="component-menu-link-icon">
                                                            <span class="material-symbols-rounded"><?php echo $icon; ?></span>
                                                        </div>
                                                        <div class="component-menu-link-text">
                                                            <span><?php echo $translatedName; ?></span>
                                                        </div>
                                                    </div>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div data-ref="hidden-role-id" data-value="<?php echo $defaultRole ? htmlspecialchars($defaultRole['id']) : ''; ?>"></div>
                            </div>
                        </div>

                        <hr class="component-divider">

                                                <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_uses_limit'); ?></h2>
                                    <p class="component-card__description"><?php echo __('desc_uses_limit'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-inline-control component-inline-control--fixed">
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustMaxUses" data-step="-5" data-min="0"><span class="material-symbols-rounded">keyboard_double_arrow_left</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustMaxUses" data-step="-1" data-min="0"><span class="material-symbols-rounded">chevron_left</span></button>
                                    </div>
                                    <div class="component-inline-control__center" data-ref="val_max_uses" data-value="0"><?php echo __('lbl_no_limit'); ?></div>
                                    <div class="component-inline-control__group">
                                        <button type="button" class="component-inline-control__btn" data-action="adjustMaxUses" data-step="1" data-max="999"><span class="material-symbols-rounded">chevron_right</span></button>
                                        <button type="button" class="component-inline-control__btn" data-action="adjustMaxUses" data-step="5" data-max="999"><span class="material-symbols-rounded">keyboard_double_arrow_right</span></button>
                                    </div>
                                </div>
                                <div data-ref="hidden-max-uses" data-value=""></div>
                            </div>
                        </div>

                        <hr class="component-divider">

                                                <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('lbl_expiration_date'); ?></h2>
                                    <p class="component-card__description"><?php echo __('desc_expiration_date'); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--start">
                                <div class="component-dropdown-wrapper">
                                    <div class="component-dropdown-trigger" data-action="openCalendarModal" data-target="inviteModuleCalendar">
                                        <span class="material-symbols-rounded">calendar_month</span>
                                        <span class="component-dropdown-text" data-ref="invite-endDate-text"><?php echo __('lbl_no_expiration'); ?></span>
                                    </div>
                                </div>
                                <div data-ref="hidden-expires-at" data-value=""></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
