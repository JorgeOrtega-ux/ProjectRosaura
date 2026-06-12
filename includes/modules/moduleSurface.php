<?php
// includes/modules/moduleSurface.php
$isLoggedIn = isset($_SESSION['user_id']);
$userPermissions = $_SESSION['user_permissions'] ?? [];
$isAdminUser = in_array('access_admin_panel', $userPermissions);

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$isAdminArea = strpos($requestUri, '/admin') !== false && $isAdminUser;
$isSettingsArea = strpos($requestUri, '/settings') !== false;
$isSitePolicyArea = strpos($requestUri, '/site-policy') !== false;
$isMainArea = !$isAdminArea && !$isSettingsArea && !$isSitePolicyArea;
?>
<div class="component-module component-module--sidebar disabled" data-module="moduleSurface">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isMainArea ? 'active' : 'disabled'; ?>" data-ref="sidebar-menu-main">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link nav-item" data-nav="/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">home</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_home'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/explore">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">explore</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_explore'); ?></span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isSitePolicyArea ? 'active' : 'disabled'; ?>" data-ref="sidebar-menu-site-policy">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_back_home'); ?></span>
                    </div>
                </div>

                <div class="component-menu-divider"></div>
                
                <div class="component-menu-link nav-item" data-nav="/site-policy">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">hub</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_policy_hub'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/site-policy/terms-conditions">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">description</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_policy_terms'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/site-policy/privacy-policy">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">privacy_tip</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_policy_privacy'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/site-policy/cookies-policy">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">cookie</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_policy_cookies'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/site-policy/legal-notice">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">gavel</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_policy_legal'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/site-policy/refund-policy">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">currency_exchange</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_policy_refunds'); ?></span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isSettingsArea ? 'active' : 'disabled'; ?>" data-ref="sidebar-menu-settings">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_back_home'); ?></span>
                    </div>
                </div>

                <div class="component-menu-divider"></div>
                
                <?php if ($isLoggedIn): ?>
                <div class="component-menu-link nav-item" data-nav="/settings/your-profile">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">person</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_profile'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/settings/security">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">security</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_security'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/settings/accessibility">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">accessibility_new</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_accessibility'); ?></span>
                    </div>
                </div>
                
                <?php else: ?>
                <div class="component-menu-link nav-item" data-nav="/settings/guest">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">person_off</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_guest_settings'); ?></span>
                    </div>
                </div>
                <?php endif; ?>

            </div>
        </div>

        <?php if ($isLoggedIn): ?>
        <div class="component-menu-bottom">
            <div class="component-menu-list">
                <div class="component-menu-link nav-item" data-nav="/settings/billing">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">credit_card</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_billing'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/settings/purchase-history">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">receipt_long</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_purchase_history'); ?></span>
                    </div>
                </div>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <?php if ($isAdminUser): ?>
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isAdminArea ? 'active' : 'disabled'; ?>" data-ref="sidebar-menu-admin">
        
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_back_home'); ?></span>
                    </div>
                </div>

                <div class="component-menu-divider"></div>
                
                <div class="component-menu-link nav-item" data-nav="/admin/dashboard">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">dashboard</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_dashboard'); ?></span>
                    </div>
                </div>
                
                <?php if (count(array_intersect(['view_users', 'edit_users', 'moderate_users', 'delete_users', 'assign_roles'], $userPermissions)) > 0): ?>
                <div class="component-menu-link nav-item" data-nav="/admin/manage-users">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">group</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_users'); ?></span>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <div class="component-menu-bottom">
            <div class="component-menu-list">
                <?php if (count(array_intersect(['create_backups', 'restore_backups', 'delete_backups'], $userPermissions)) > 0): ?>
                <div class="component-menu-link nav-item" data-nav="/admin/backups">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">backup</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_backups'); ?></span>
                    </div>
                </div>
                <?php endif; ?>
                
                <?php if (in_array('manage_server_config', $userPermissions)): ?>
                <div class="component-menu-link nav-item" data-nav="/admin/server-config">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">dns</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_server'); ?></span>
                    </div>
                </div>
                <?php endif; ?>
            </div>
        </div>

    </div>
    <?php endif; ?>

</div>