<?php
// includes/modules/moduleSurface.php
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';
$userIdentifier = $_SESSION['user_uuid'] ?? $_SESSION['user_id'] ?? '';
$isAdminUser = ($userRole === 'founder' || $userRole === 'administrator');

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$isAdminArea = strpos($requestUri, '/admin') !== false && $isAdminUser;
$isSettingsArea = strpos($requestUri, '/settings') !== false;
$isStudioArea = strpos($requestUri, '/studio') !== false && $isLoggedIn;
$isMainArea = !$isAdminArea && !$isSettingsArea && !$isStudioArea;
?>
<div class="component-module component-module--sidebar disabled" data-module="moduleSurface">
    
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isMainArea ? 'active' : 'disabled'; ?>" data-ref="sidebar-menu-main">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">home</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_home'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/explore">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">explore</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_explore'); ?></span>
                    </div>
                </div>
            </div>
        </div>

        <?php if ($isLoggedIn): ?>
        <div class="component-menu-bottom">
            <div class="component-menu-list">
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/feed/playlists">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">video_library</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_my_playlists'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/playlist?list=WL">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">watch_later</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('system_playlist_watch_later'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/playlist?list=LL">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">thumb_up</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_liked_videos'); ?></span>
                    </div>
                </div>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <?php if ($isLoggedIn): ?>
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isStudioArea ? 'active' : 'disabled'; ?>" data-ref="sidebar-menu-studio">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="<?php echo APP_URL; ?>/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_back_home'); ?></span>
                    </div>
                </div>

                <div class="component-menu-divider"></div>
                
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/studio/management-panel/<?php echo $userIdentifier; ?>">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">dashboard</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_studio_management'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/studio/manage-content/<?php echo $userIdentifier; ?>">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">video_library</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_studio_content'); ?></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isSettingsArea ? 'active' : 'disabled'; ?>" data-ref="sidebar-menu-settings">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="<?php echo APP_URL; ?>/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_back_home'); ?></span>
                    </div>
                </div>

                <div class="component-menu-divider"></div>
                
                <?php if ($isLoggedIn): ?>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/settings/your-profile">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">person</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_profile'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/settings/security">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">security</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_security'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/settings/accessibility">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">accessibility_new</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_accessibility'); ?></span>
                    </div>
                </div>
                <?php else: ?>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/settings/guest">
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
    <div class="component-menu component-menu--w265 component-menu--h-full component-menu--no-padding <?php echo $isAdminArea ? 'active' : 'disabled'; ?>" data-ref="sidebar-menu-admin">
        <div class="component-menu-top">
            <div class="component-menu-list">
                <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="<?php echo APP_URL; ?>/">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_back_home'); ?></span>
                    </div>
                </div>

                <div class="component-menu-divider"></div>
                
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/admin/dashboard">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">dashboard</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_dashboard'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/admin/manage-users">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">group</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_users'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/admin/tags">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">label</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('route_admin_tags'); ?></span>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-menu-bottom">
            <div class="component-menu-list">
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/admin/backups">
                    <div class="component-menu-link-icon">
                        <span class="material-symbols-rounded">backup</span>
                    </div>
                    <div class="component-menu-link-text">
                        <span><?php echo __('menu_admin_backups'); ?></span>
                    </div>
                </div>
                <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/admin/server-config">
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