<?php
// includes/views/admin/dashboard.php
if (session_status() === PHP_SESSION_NONE) session_start();

// Obtenemos los permisos del usuario de la sesión, si no existe devolvemos un array vacío
$userPermissions = $_SESSION['user_permissions'] ?? [];

// Validamos si tiene los permisos requeridos usando la NUEVA NOMENCLATURA
$canManageRoles = in_array('view_roles', $userPermissions);
$canViewLogs = in_array('view_logs', $userPermissions);

?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_dashboard_title'); ?></h1>
            </div>
            <div class="component-top-right">
                
                <button class="component-button component-button--icon component-button--h40 <?php echo !$canManageRoles ? 'disabled-interaction' : ''; ?>" data-nav="<?php echo APP_URL; ?>/admin/manage-roles" data-tooltip="<?php echo __('btn_manage_roles'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                </button>
                <button class="component-button component-button--icon component-button--h40 <?php echo !$canViewLogs ? 'disabled-interaction' : ''; ?>" data-nav="<?php echo APP_URL; ?>/admin/logs" data-tooltip="<?php echo __('btn_view_logs'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">receipt_long</span>
                </button>

            </div>
        </div>

        <div class="component-bottom component-bottom--padded">
            
            <div class="component-stat-grid">
                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">person_add</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_new_users', 'Nuevos Registros'); ?></span>
                        <span class="component-stat-card__value" id="stat-new-users">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">login</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_logins', 'Inicios de Sesión'); ?></span>
                        <span class="component-stat-card__value" id="stat-logins">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">visibility</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_pageviews', 'Vistas de Página'); ?></span>
                        <span class="component-stat-card__value" id="stat-pageviews">--</span>
                    </div>
                </div>
            </div>

            <div class="component-charts-layout">
                <div class="component-item-card component-chart-card">
                    <div class="component-chart-card__header">
                        <h3 class="component-card__title"><?php echo __('admin_dashboard_chart_registrations', 'Evolución de Registros'); ?></h3>
                    </div>
                    <div class="component-chart-card__canvas">
                        <canvas id="chart-registrations"></canvas>
                    </div>
                </div>

                <div class="component-item-card component-chart-card">
                    <div class="component-chart-card__header">
                        <h3 class="component-card__title"><?php echo __('admin_dashboard_chart_activity', 'Actividad del Sistema (Vistas vs Logins)'); ?></h3>
                    </div>
                    <div class="component-chart-card__canvas">
                        <canvas id="chart-activity"></canvas>
                    </div>
                </div>
            </div>

        </div> 
    </div>
</div>