<?php 
// includes/layouts/header.php
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';
$userPic = $_SESSION['user_pic'] ?? '';
global $serverConfig;
$isMaintenanceActive = isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1;
$isPrivileged = in_array($userRole, ['administrator', 'founder']);
?>
<script>
    window.AppRouteTitles = {
        '/': "<?php echo __('route_home'); ?>",
        '/explore': "<?php echo __('route_explore'); ?>",
        '/login': "<?php echo __('route_login'); ?>",
        '/register': "<?php echo __('route_register'); ?>",
        '/settings': "<?php echo __('route_settings'); ?>",
        '/settings/your-profile': "<?php echo __('route_profile'); ?>",
        '/settings/security': "<?php echo __('route_security'); ?>",
        '/settings/accessibility': "<?php echo __('route_accessibility'); ?>",
        '/settings/guest': "<?php echo __('route_guest'); ?>",
        '/settings/change-password': "<?php echo __('route_change_password'); ?>",
        '/settings/2fa': "<?php echo __('route_2fa'); ?>",
        '/settings/devices': "<?php echo __('route_devices'); ?>",
        '/settings/delete-account': "<?php echo __('route_delete_account'); ?>",
        '/account-suspended': "<?php echo __('route_suspended'); ?>",
        '/account-deleted': "<?php echo __('route_deleted'); ?>",
        '/admin': "<?php echo __('route_admin_dashboard'); ?>",
        '/admin/dashboard': "<?php echo __('route_admin_dashboard'); ?>",
        '/admin/manage-users': "<?php echo __('route_admin_users'); ?>",
        '/admin/edit-user': "Gestionar Cuenta",
        '/admin/edit-role': "Gestionar Rol",
        '/admin/edit-status': "Gestionar Estado",
        '/admin/backups': "<?php echo __('route_admin_backups'); ?>",
        '/admin/backups/automation': "<?php echo __('route_admin_backups_automation'); ?>",
        '/admin/server-config': "<?php echo __('route_admin_server'); ?>",
        '/admin/logs': "<?php echo __('route_admin_logs'); ?>"
    };
    window.AppName = "ProjectRosaura";
</script>

<div class="header">
    <div class="header-left">
        <div class="component-actions">
            <button class="component-button component-button--icon component-button--h40" data-action="toggleModuleSurface" data-tooltip="Menú principal" data-position="bottom">
                <span class="material-symbols-rounded">menu</span>
            </button>
        </div>
    </div>
    <div class="header-center">
        <div class="component-search">
            <div class="component-search-icon">
                <span class="material-symbols-rounded">search</span>
            </div>
            <div class="component-search-input">
                <input type="text" placeholder="<?php echo __('search_placeholder'); ?>">
            </div>
        </div>
    </div>
    <div class="header-right">
        <div class="component-actions">
            
            <button class="component-button component-button--icon component-button--h40 mobile-search-btn" data-action="toggleMobileSearch" data-tooltip="Buscar" data-position="bottom">
                <span class="material-symbols-rounded">search</span>
            </button>

            <?php if ($isMaintenanceActive && $isPrivileged): ?>
                <button class="component-button component-button--icon component-button--h40" style="color: #ff9800; background-color: rgba(255, 152, 0, 0.1);" data-tooltip="¡Sitio en Mantenimiento!" data-position="bottom">
                    <span class="material-symbols-rounded">warning</span>
                </button>
            <?php endif; ?>

            <?php if (!$isLoggedIn): ?>
                <button class="component-button component-button--dark component-button--h40" data-nav="/ProjectRosaura/login">
                    <?php echo __('btn_login'); ?>
                </button>
                <button class="component-button component-button--icon component-button--h40" data-action="toggleModuleMainOptions" data-tooltip="Opciones" data-position="bottom">
                    <span class="material-symbols-rounded">more_vert</span>
                </button>
            <?php else: ?>
                <button class="component-button component-button--profile role-<?php echo htmlspecialchars($userRole); ?>" data-action="toggleModuleMainOptions" data-tooltip="Tu cuenta" data-position="bottom">
                    <img src="/ProjectRosaura/<?php echo htmlspecialchars($userPic); ?>" alt="<?php echo __('alt_profile'); ?>">
                </button>
            <?php endif; ?>

        </div>
    </div>

    <?php include __DIR__ . '/../modules/moduleMainOptions.php'; ?>

</div>