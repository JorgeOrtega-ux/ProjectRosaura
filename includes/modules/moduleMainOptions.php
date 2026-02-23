<?php 
// includes/modules/moduleMainOptions.php
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';
$isAdmin = ($userRole === 'founder' || $userRole === 'administrator');

// 1. Asignamos la ruta final directamente para que coincida con el backend
$settingsLink = $isLoggedIn ? '/ProjectRosaura/settings/your-profile' : '/ProjectRosaura/settings/guest';
?>
<div class="component-module component-module--dropdown disabled" data-module="moduleMainOptions">
    <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
        
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-list component-menu-list--scrollable">
            
            <?php if ($isLoggedIn && $isAdmin): ?>
            <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="/ProjectRosaura/admin">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Panel de administración</span>
                </div>
            </div>
            <div class="component-menu-divider"></div>
            <?php endif; ?>

            <div class="component-menu-link nav-item" data-nav="<?php echo $settingsLink; ?>">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">settings</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_settings'); ?></span>
                </div>
            </div>
            <div class="component-menu-link">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">help</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_help'); ?></span>
                </div>
            </div>
            
            <?php if ($isLoggedIn): ?>
            <div class="component-menu-link" data-action="submitLogout">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">logout</span>
                </div>
                <div class="component-menu-link-text">
                    <span><?php echo __('menu_logout'); ?></span>
                </div>
            </div>
            <?php endif; ?>

        </div>
    </div>
</div>