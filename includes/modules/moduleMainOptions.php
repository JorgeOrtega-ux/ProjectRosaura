<?php 
// includes/modules/moduleMainOptions.php
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';
$isAdmin = ($userRole === 'founder' || $userRole === 'administrator');

// Extraemos el identificador único que AuthServices guarda en la sesión
$currentIdentifier = $_SESSION['user_identifier'] ?? ''; 

// Mantenemos el nombre de usuario por si lo necesitas como fallback o para otras partes visuales
$currentUsername = $_SESSION['user_name'] ?? ''; 

// Asignamos la ruta final directamente para que coincida con el backend
$settingsLink = $isLoggedIn ? APP_URL . '/settings/your-profile' : APP_URL . '/settings/guest';

// Ruta para el canal dinámico (con el @identificador)
$channelLink = $isLoggedIn && $currentIdentifier ? APP_URL . '/@' . $currentIdentifier : '#';
?>
<div class="component-module component-module--dropdown disabled" data-module="moduleMainOptions">
    <div class="component-menu component-menu--w265 component-menu--h-auto component-menu--no-padding">
        
        <div class="pill-container"><div class="drag-handle"></div></div>
        
        <div class="component-menu-list component-menu-list--scrollable">
            
            <?php if ($isLoggedIn && $isAdmin): ?>
            <div class="component-menu-link component-menu-link--bordered nav-item" data-nav="<?php echo APP_URL; ?>/admin/dashboard">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Panel de administración</span>
                </div>
            </div>
            <div class="component-menu-divider"></div>
            <?php endif; ?>

            <?php if ($isLoggedIn): ?>
            <div class="component-menu-link nav-item" data-nav="<?php echo $channelLink; ?>">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">account_box</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Tu canal</span>
                </div>
            </div>
            <div class="component-menu-divider"></div>
            
            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/settings/history">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">history</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Historial</span>
                </div>
            </div>
            
            <div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/playlist?list=WL">
                <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">schedule</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Ver más tarde</span>
                </div>
            </div>
            
<div class="component-menu-link nav-item" data-nav="<?php echo APP_URL; ?>/playlist?list=LL">
                    <div class="component-menu-link-icon">
                    <span class="material-symbols-rounded">thumb_up</span>
                </div>
                <div class="component-menu-link-text">
                    <span>Videos que me gustan</span>
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