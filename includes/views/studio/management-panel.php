<?php
// includes/views/studio/management-panel.php
if (session_status() === PHP_SESSION_NONE) session_start();
$userRole = $_SESSION['user_role'] ?? 'user';
$canUpload = $_SESSION['user_can_upload'] ?? 0;
$hasPermission = in_array($userRole, ['founder', 'administrator']) || $canUpload == 1;

if (!$hasPermission) {
    echo '<div class="view-content"><div class="component-wrapper component-wrapper--full no-padding"><div class="component-container" style="text-align:center; padding: 50px;"><span class="material-symbols-rounded" style="font-size: 64px; color: var(--color-error);">block</span><h1 style="margin-top:20px;">Acceso Denegado</h1><p style="opacity:0.7;">No tienes los permisos necesarios para gestionar el Studio de videos.</p></div></div></div>';
    return;
}
?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding">
        <div class="component-container">
            <h1><?php echo __('route_studio_management'); ?></h1>
            <p><?php echo __('studio_management_panel_empty'); ?></p>
        </div>
    </div>
</div>