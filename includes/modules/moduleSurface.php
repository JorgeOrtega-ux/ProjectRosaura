<?php
// includes/modules/moduleSurface.php
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';
$isAdminUser = ($userRole === 'founder' || $userRole === 'administrator');

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$isAdminArea = strpos($requestUri, '/admin') !== false && $isAdminUser;
$isSettingsArea = strpos($requestUri, '/settings') !== false;
$isMainArea = !$isAdminArea && !$isSettingsArea;
?>
<div class="component-module component-module--sidebar disabled" data-module="moduleSurface">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isMainArea ? 'active' : 'disabled'; ?>" id="sidebar-menu-main">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">home</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_home'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/explore">
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

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isSettingsArea ? 'active' : 'disabled'; ?>" id="sidebar-menu-settings">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="/ProjectRosaura/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_back_home'); ?></span>
                    </div>
                </div>

                <div class="component-menu-divider"></div>
                
                <?php if ($isLoggedIn): ?>
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/settings/your-profile">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">person</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_profile'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/settings/security">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">security</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_security'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/settings/accessibility">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">accessibility_new</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_accessibility'); ?></span>
                    </div>
                </div>
                <?php else: ?>
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/settings/guest">
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
    </div>

    <?php if ($isAdminUser): ?>
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isAdminArea ? 'active' : 'disabled'; ?>" id="sidebar-menu-admin">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="/ProjectRosaura/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_back_home'); ?></span>
                    </div>
                </div>

                <div class="component-menu-divider"></div>
                
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/admin/dashboard">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">dashboard</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_dashboard'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/admin/manage-users">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">group</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_users'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/admin/backups">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">backup</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_backups'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="/ProjectRosaura/admin/server-config">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">dns</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_server'); ?></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

</div>