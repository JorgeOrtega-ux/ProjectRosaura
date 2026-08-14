<?php
use App\Api\Services\Canvas\CanvasViewService;

$canvasService = new CanvasViewService();
$rolePermData = $canvasService->getCanvasRolePermissionsData($_GET['uuid'] ?? null, $_GET['role_uuid'] ?? null);

if (!empty($rolePermData['redirect'])) {
    header("Location: " . $rolePermData['redirect']);
    exit;
}

if (!empty($rolePermData['error'])) {
    if ($rolePermData['error'] === __('err_plan_custom_roles')) {
        $systemMessageType = 'subscription_required';
        require ROOT_PATH . '/includes/views/system/message.php';
        return;
    }
    if ($rolePermData['error'] === __('err_canvas_not_found') || $rolePermData['error'] === __('err_user_not_member')) {
        $systemMessageType = '404';
        require ROOT_PATH . '/includes/views/system/message.php';
        return;
    }
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
}

extract($rolePermData);
$isSystemRole = (isset($roleData['is_system']) && (int)$roleData['is_system'] === 1);

if (!$canManageRoles) {
    global $systemMessageType;
    $systemMessageType = 'no_permission';
    require ROOT_PATH . '/includes/views/system/message.php';
    return;
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

<div class="view-content" data-ref="canvasRolePermissionsView" data-canvas-id="<?php echo $canvasId; ?>" data-canvas-uuid="<?php echo $canvasUuid; ?>" data-role-id="<?php echo $roleId; ?>" data-user-weight="<?php echo $userRolesWeight; ?>" data-role-weight="<?php echo (int)$roleData['weight']; ?>" data-is-system="<?php echo $isSystemRole ? '1' : '0'; ?>">
    
    <div class="component-top">
        <div class="component-top-left">

            <h1 class="component-top-title" data-ref="role-name-display">
                <?php echo __('admin_edit_role_permissions_title'); ?>: <?php echo htmlspecialchars($translatedName !== '' ? $translatedName : __('admin_role_undefined')); ?>
            </h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40" data-action="savePermissions" data-tooltip="<?php echo __('btn_save'); ?>" data-position="bottom" <?php echo $isSystemRole ? 'disabled' : ''; ?>>
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                <?php if ($isSystemRole): ?>
                <div class="component-alert component-alert--warning active">
                    <div class="component-alert-icon">
                        <span class="material-symbols-rounded">info</span>
                    </div>
                    <div class="component-alert-text"><?php echo __('msg_system_role_protected'); ?></div>
                </div>
                <?php endif; ?>

                <div data-ref="permissions-container" class="component-list">
                    <?php if (empty($allPermissions)): ?>
                        <div class="component-empty-state">
                            <span class="material-symbols-rounded empty-icon">lock</span>
                            <h3><?php echo __('admin_perms_empty_title'); ?></h3>
                        </div>
                    <?php else: ?>
                        <?php foreach ($allPermissions as $p): ?>
                            <?php 
                                $isChecked = in_array($p['id'], $rolePermissions) ? 'checked' : ''; 
                                
                                $permName = $p['name'];
                                $cleanPermName = preg_replace('/[\s\W_]+/', '_', strtolower(trim($permName)));
                                $permNameTranslated = __('perm.' . $cleanPermName);
                                if ($permNameTranslated === 'perm.' . $cleanPermName) $permNameTranslated = str_replace('_', ' ', ucfirst($permName));

                                $permDescTranslated = __('perm.desc_' . $cleanPermName);
                                if ($permDescTranslated === 'perm.desc_' . $cleanPermName) {
                                    $permDescTranslated = __('desc_' . $cleanPermName);
                                    if ($permDescTranslated === 'desc_' . $cleanPermName) {
                                        $permDescTranslated = !empty($p['description']) ? __($p['description']) : '';
                                    }
                                }
                            ?>
                            <div class="component-card--grouped">
                                <div class="component-group-item">
                                    <div class="component-card__content">
                                        <div class="component-card__text" data-perm-key="<?php echo htmlspecialchars($p['name']); ?>">
                                            <h2 class="component-card__title" data-ref="perm-name"><?php echo htmlspecialchars($permNameTranslated); ?></h2>
                                            <?php if (!empty($permDescTranslated)): ?>
                                                <p class="component-card__description" data-ref="perm-desc"><?php echo htmlspecialchars($permDescTranslated); ?></p>
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--end">
                                        <label class="component-toggle-switch">
                                            <input type="checkbox" data-ref="permCheckbox" value="<?php echo $p['id']; ?>" <?php echo $isChecked; ?> <?php echo $isSystemRole ? 'disabled' : ''; ?>>
                                            <span class="component-toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>
