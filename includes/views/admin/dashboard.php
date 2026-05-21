<?php
// includes/views/admin/dashboard.php
if (session_status() === PHP_SESSION_NONE) session_start();

// Obtenemos los permisos del usuario de la sesión, si no existe devolvemos un array vacío
$userPermissions = $_SESSION['user_permissions'] ?? [];

// Validamos si tiene los permisos requeridos usando la NUEVA NOMENCLATURA
$canManageRoles = in_array('view_roles', $userPermissions);
$canViewLogs = in_array('view_logs', $userPermissions);

// Fechas por defecto para los inputs (Últimos 30 días)
$defaultStartDate = date('Y-m-d', strtotime('-30 days'));
$defaultEndDate = date('Y-m-d');

?>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_dashboard_title'); ?></h1>
            </div>
            <div class="component-top-right">
                
                <div class="dashboard-date-filter">
                    <div class="component-input-group component-input-group--h34 dashboard-date-filter__input">
                        <input type="date" id="dash-start-date" class="component-input-field component-input-field--simple" value="<?php echo $defaultStartDate; ?>">
                    </div>
                    <span class="dashboard-date-filter__separator">-</span>
                    <div class="component-input-group component-input-group--h34 dashboard-date-filter__input">
                        <input type="date" id="dash-end-date" class="component-input-field component-input-field--simple" value="<?php echo $defaultEndDate; ?>">
                    </div>
                    <button id="dash-apply-filters" class="component-button component-button--icon component-button--h34" data-tooltip="<?php echo __('btn_apply_filters', 'Filtrar'); ?>" data-position="bottom">
                        <span class="material-symbols-rounded">filter_alt</span>
                    </button>
                </div>

                <div class="dashboard-header-divider"></div>

                <button class="component-button component-button--icon component-button--h34 <?php echo !$canManageRoles ? 'disabled-interaction' : ''; ?>" data-nav="<?php echo APP_URL; ?>/admin/manage-roles" data-tooltip="<?php echo __('btn_manage_roles'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">admin_panel_settings</span>
                </button>
                <button class="component-button component-button--icon component-button--h34 <?php echo !$canViewLogs ? 'disabled-interaction' : ''; ?>" data-nav="<?php echo APP_URL; ?>/admin/logs" data-tooltip="<?php echo __('btn_view_logs'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">receipt_long</span>
                </button>
            </div>
        </div>

        <div class="component-bottom component-bottom--padded dashboard-wrapper">
            
            <div class="dashboard-grid">
                <div class="component-item-card stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered stat-card__icon">
                        <span class="material-symbols-rounded">person_add</span>
                    </div>
                    <div class="stat-card__content">
                        <span class="stat-card__title"><?php echo __('admin_dashboard_new_users', 'Nuevos Registros'); ?></span>
                        <span class="stat-card__value" id="stat-new-users">--</span>
                    </div>
                </div>

                <div class="component-item-card stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered stat-card__icon">
                        <span class="material-symbols-rounded">login</span>
                    </div>
                    <div class="stat-card__content">
                        <span class="stat-card__title"><?php echo __('admin_dashboard_logins', 'Inicios de Sesión'); ?></span>
                        <span class="stat-card__value" id="stat-logins">--</span>
                    </div>
                </div>

                <div class="component-item-card stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered stat-card__icon">
                        <span class="material-symbols-rounded">visibility</span>
                    </div>
                    <div class="stat-card__content">
                        <span class="stat-card__title"><?php echo __('admin_dashboard_pageviews', 'Vistas de Página'); ?></span>
                        <span class="stat-card__value" id="stat-pageviews">--</span>
                    </div>
                </div>
            </div>

            <div class="dashboard-charts">
                <div class="component-item-card chart-card">
                    <div class="chart-card__header">
                        <h3 class="component-card__title"><?php echo __('admin_dashboard_chart_registrations', 'Evolución de Registros'); ?></h3>
                    </div>
                    <div class="chart-card__canvas-wrapper">
                        <canvas id="chart-registrations"></canvas>
                    </div>
                </div>

                <div class="component-item-card chart-card">
                    <div class="chart-card__header">
                        <h3 class="component-card__title"><?php echo __('admin_dashboard_chart_activity', 'Actividad del Sistema (Vistas vs Logins)'); ?></h3>
                    </div>
                    <div class="chart-card__canvas-wrapper">
                        <canvas id="chart-activity"></canvas>
                    </div>
                </div>
            </div>

        </div> 
    </div>
</div>