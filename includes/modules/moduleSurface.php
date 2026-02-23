<?php
// includes/modules/moduleSurface.php
$isLoggedIn = isset($_SESSION['user_id']);
?>
<div class="component-module component-module--sidebar disabled" data-module="moduleSurface">
    <div class="component-menu component-menu--w265 component-menu--h-full">
        
        <div class="component-menu-top" id="sidebar-menu-main">
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

        <div class="component-menu-top" id="sidebar-menu-settings" style="display: none;">
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
</div>