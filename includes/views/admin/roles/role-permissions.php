<?php
use App\Api\Services\Admin\AdminViewService;

$adminService = new AdminViewService();
$rolePermData = $adminService->getRolePermissionsData($_GET['uuid'] ?? null);

if (!empty($rolePermData['redirect'])) {
    header("Location: " . $rolePermData['redirect']);
    exit;
}

if (!empty($rolePermData['error'])) {
    echo "<div class='view-content'><p>".htmlspecialchars($rolePermData['error'])."</p></div>";
    return;
}

extract($rolePermData);
$currentUserWeight = isset($_SESSION['user_role_weight']) ? (int)$_SESSION['user_role_weight'] : 0;
$userRolesArray = isset($_SESSION['user_roles']) && is_array($_SESSION['user_roles']) ? $_SESSION['user_roles'] : [];
$isSuperAdmin = in_array(4, $userRolesArray) ? 1 : 0;
$targetRoleWeight = isset($role['weight']) ? (int)$role['weight'] : 0;
$rolePermissionsIds = $rolePermissions;

$categories = [
    'users' => [
        'title' => __('perm_cat_users'),
        'icon' => 'group',
        'perms' => ['view_users', 'edit_users', 'moderate_users', 'delete_users', 'view_kardex', 'manage_kardex', 'view_user_purchases']
    ],
    'roles' => [
        'title' => __('perm_cat_roles'),
        'icon' => 'admin_panel_settings',
        'perms' => ['view_roles', 'manage_roles_structure', 'assign_roles']
    ],
    'subscriptions' => [
        'title' => __('perm_cat_subscriptions'),
        'icon' => 'workspace_premium',
        'perms' => ['manage_subscriptions']
    ],
    'store' => [
        'title' => __('perm_cat_store'),
        'icon' => 'storefront',
        'perms' => ['manage_store_packages', 'manage_store_perks']
    ],
    'content' => [
        'title' => __('perm_cat_content'),
        'icon' => 'chat',
        'perms' => ['manage_content']
    ],
    'canvases' => [
        'title' => __('perm_cat_canvases'),
        'icon' => 'palette',
        'perms' => ['create_canvas', 'manage_canvases', 'join_canvas']
    ],
    'backups' => [
        'title' => __('perm_cat_backups'),
        'icon' => 'backup',
        'perms' => ['create_backups', 'restore_backups', 'delete_backups', 'download_backups']
    ],
    'logs' => [
        'title' => __('perm_cat_logs'),
        'icon' => 'history',
        'perms' => ['view_logs', 'delete_logs']
    ],
    'system' => [
        'title' => __('perm_cat_system'),
        'icon' => 'settings',
        'perms' => ['access_admin_panel', 'view_dashboard', 'manage_server_config', 'perform_system_maintenance']
    ]
];

$groupedPermissions = [];
foreach ($categories as $key => $catInfo) {
    $groupedPermissions[$key] = [
        'title' => $catInfo['title'],
        'icon' => $catInfo['icon'],
        'list' => []
    ];
}
$groupedPermissions['other'] = [
    'title' => __('perm_cat_other'),
    'icon' => 'extension',
    'list' => []
];

if (!empty($allPermissions)) {
    foreach ($allPermissions as $p) {
        $matched = false;
        foreach ($categories as $key => $catInfo) {
            if (in_array($p['name'], $catInfo['perms'])) {
                $groupedPermissions[$key]['list'][] = $p;
                $matched = true;
                break;
            }
        }
        if (!$matched) {
            $groupedPermissions['other']['list'][] = $p;
        }
    }
}
?>
<?php
$isSystemRole = (isset($role['is_system']) && (int)$role['is_system'] === 1);
?>
<div class="view-content" data-role-id="<?php echo $roleId; ?>" data-role-weight="<?php echo $targetRoleWeight; ?>" data-current-user-weight="<?php echo $currentUserWeight; ?>" data-is-superadmin="<?php echo $isSuperAdmin; ?>" data-is-system="<?php echo $isSystemRole ? '1' : '0'; ?>">
    
    <div class="component-top">
        <div class="component-top-left">
            <?php 
            $rawName = $role['name'] ?? '';
            $roleKey = 'role.' . preg_replace('/[\s\W_]+/', '_', strtolower(trim($rawName)));
            ?>
            <h1 class="component-top-title" data-ref="role-name-display">
                <?php echo __('admin_edit_role_permissions_title'); ?>: <?php echo htmlspecialchars(__($roleKey)); ?>
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
                            <span class="material-symbols-rounded component-empty-state-icon">lock</span>
                            <p class="component-empty-state-text"><?php echo __('admin_perms_empty_title'); ?></p>
                        </div>
                    <?php else: ?>
                        <?php foreach ($groupedPermissions as $catKey => $catData): 
                            if (empty($catData['list'])) continue;
                        ?>
                            <div class="component-card--grouped component-accordion">
                                <div class="component-group-item component-accordion-header" data-action="toggleAccordion">
                                    <div class="component-card__content">
                                        <div class="component-card__icon-container component-card__icon-container--bordered">
                                            <span class="material-symbols-rounded"><?php echo $catData['icon']; ?></span>
                                        </div>
                                        <div class="component-card__text">
                                            <h2 class="component-card__title"><?php echo htmlspecialchars($catData['title']); ?></h2>
                                        </div>
                                    </div>
                                    <div class="component-card__actions component-card__actions--end">
                                        <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                                    </div>
                                </div>
                                <div class="component-accordion-body">
                                    <div class="component-accordion-content component-list component-list--flush">
                                        <?php foreach ($catData['list'] as $p): 
                                            $isChecked = in_array($p['id'], $rolePermissionsIds) ? 'checked' : ''; 
                                            $isCritical = isset($p['is_critical']) ? (int)$p['is_critical'] : 0;
                                            $cleanPermName = preg_replace('/[\s\W_]+/', '_', strtolower(trim($p['name'])));
                                            $permNameTranslated = __('perm.' . $cleanPermName);
                                            $permDescTranslated = __('perm.desc_' . $cleanPermName);
                                            if ($permNameTranslated === 'perm.' . $cleanPermName) {
                                                $permNameTranslated = __('permissions.' . $cleanPermName . '.name', [], $p['name']);
                                                $permDescTranslated = __('permissions.' . $cleanPermName . '.desc', [], $p['description'] ?? '');
                                            }
                                        ?>
                                            <div class="component-group-item">
                                                <div class="component-card__content">
                                                    <div class="component-card__text" data-perm-key="<?php echo htmlspecialchars($p['name']); ?>">
                                                        <h2 class="component-card__title" data-ref="perm-name"><?php echo htmlspecialchars($permNameTranslated); ?></h2>
                                                        <p class="component-card__description" data-ref="perm-desc"><?php echo htmlspecialchars($permDescTranslated); ?></p>
                                                    </div>
                                                </div>
                                                <div class="component-card__actions component-card__actions--end">
                                                    <label class="component-toggle-switch">
                                                        <input type="checkbox" data-ref="permCheckbox" value="<?php echo $p['id']; ?>" data-is-critical="<?php echo $isCritical; ?>" <?php echo $isChecked; ?> <?php echo $isSystemRole ? 'disabled' : ''; ?>>
                                                        <span class="component-toggle-slider"></span>
                                                    </label>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
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