<?php
if (session_status() === PHP_SESSION_NONE) session_start();

use App\Config\DatabaseManager;
use App\Config\RedisCache;
use App\Core\Repositories\UserRepository;
use App\Core\Repositories\RoleRepository;

$targetUserId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($targetUserId <= 0) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$db = new DatabaseManager();
$redis = new RedisCache();
$roleRepo = new RoleRepository($db, $redis);
$userRepo = new UserRepository($db, $roleRepo);

$user = $userRepo->findById($targetUserId);
if (!$user) {
    header("Location: " . (defined('APP_URL') ? APP_URL : '') . "/admin/manage-users");
    exit;
}

$allRoles = $roleRepo->getAll();
$assignedRoles = $roleRepo->getUserRoles($targetUserId);
$assignedRoleIds = array_column($assignedRoles, 'id');

$isSuperAdmin = isset($_SESSION['user_role_id']) && (int)$_SESSION['user_role_id'] === 4;
$currentUserWeight = $_SESSION['user_role_weight'] ?? 0;

$isTargetSuperAdmin = in_array(4, $assignedRoleIds);
?>
<div class="view-content" data-user-id="<?php echo $targetUserId; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('admin_manage_role_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--icon component-button--h40" data-action="cancelRoleUpdate" data-tooltip="<?php echo __('btn_cancel'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">close</span>
            </button>
            <button class="component-button component-button--icon component-button--h40" data-action="submitMultipleRolesUpdate" data-tooltip="<?php echo __('btn_verify_execute'); ?>" data-position="bottom">
                <span class="material-symbols-rounded">save</span>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">

                <div data-ref="admin-roles-form">
                    <div class="component-card--grouped">
                        
                        <div class="component-group-item component-group-item--stacked">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title"><?php echo __('admin_assign_role_title'); ?></h2>
                                    <p class="component-card__description" data-ref="admin-role-desc">
                                        <?php echo $isTargetSuperAdmin ? '<span class="component-text-notice--error">'.__('admin_role_err_modify_super').'</span>' : __('desc_select_multiple_roles'); ?>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <?php 
                        $rolesCount = count($allRoles);
                        foreach ($allRoles as $index => $r): 
                            $rKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($r['name'])));
                            $rTrans = __($rKey);

                            $rDescKey = 'role_desc.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($r['name'])));
                            $rDescTrans = __($rDescKey);

                            $isHigherHierarchy = !$isSuperAdmin && (int)$r['weight'] >= $currentUserWeight;
                            $isDisabled = ($r['id'] == 4 || $isHigherHierarchy || $r['id'] == 1 || $isTargetSuperAdmin) ? true : false;
                            
                            $isChecked = in_array($r['id'], $assignedRoleIds) ? 'checked' : '';
                            $disabledClass = $isDisabled ? 'disabled-interactive' : '';
                            $opacityStyle = $isDisabled ? 'opacity: 0.6; pointer-events: none;' : '';
                        ?>
                        
                        <hr class="component-divider">

                        <div class="component-group-item component-group-item--wrap" style="<?php echo $opacityStyle; ?>">
                            <div class="component-card__content">
                                <div class="component-card__text">
                                    <h2 class="component-card__title" style="display: flex; align-items: center; gap: 8px;">
                                        <?php echo htmlspecialchars($rTrans); ?>
                                        
                                        <?php if($r['id'] == 1): ?> 
                                            <span class="component-badge component-badge--default" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--bg-level-2);"><?php echo __('lbl_base_role'); ?></span> 
                                        <?php endif; ?>
                                        
                                        <?php if ($r['id'] == 4): ?>
                                            <span class="material-symbols-rounded" style="font-size: 16px; color: var(--text-color-muted);" title="<?php echo __('title_only_db'); ?>">lock</span>
                                        <?php endif; ?>
                                    </h2>
                                    <p class="component-card__description"><?php echo htmlspecialchars($rDescTrans); ?></p>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end">
                                <label class="component-toggle-switch <?php echo $isDisabled ? 'disabled-interaction' : ''; ?>">
                                    <input type="checkbox" name="assigned_roles[]" value="<?php echo htmlspecialchars($r['id']); ?>" class="admin-role-checkbox <?php echo $disabledClass; ?>" <?php echo $isChecked; ?>>
                                    <span class="component-toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        <?php endforeach; ?>

                    </div>
                </div>

            </div>
        </div>
    </div>
</div>