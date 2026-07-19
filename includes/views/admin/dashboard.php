<?php
if (session_status() === PHP_SESSION_NONE) session_start();

$userPermissions = $_SESSION['user_permissions'] ?? [];

$canManageRoles = in_array(\App\Core\System\PermissionsConstants::VIEW_ROLES, $userPermissions);
$canViewLogs = in_array('view_logs', $userPermissions);
$canManageMessages = true; // All admins currently

?>
<script src="<?php echo APP_URL; ?>/assets/js/vendor/chart.js"></script>
<style>
    .dashboard-charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
        margin-top: 24px;
    }
    .dashboard-chart-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-lg, 12px);
        box-sizing: border-box;
        overflow: hidden;
    }
    .dashboard-chart-header {
        padding: 8px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .dashboard-chart-body {
        position: relative;
        height: 350px;
        width: 100%;
        background: var(--bg-surface);
    }
    .dashboard-chart-card .component-top-title {
        margin: 0;
        font-size: 16px;
    }
    .component-stat-card__title,
    .component-stat-card__value {
        font-size: 14px !important;
    }
</style>
<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding h-full-flex">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('admin_dashboard_title'); ?></h1>
            </div>
            <div class="component-top-right">
                
                <button class="component-button component-button--icon component-button--h40 <?php echo !$canManageMessages ? 'disabled-interaction' : ''; ?>" data-nav="<?php echo APP_URL; ?>/admin/messages" data-tooltip="<?php echo __('admin_manage_messages'); ?>" data-position="bottom">
                    <span class="material-symbols-rounded">chat</span>
                </button>
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
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_new_users'); ?></span>
                        <span class="component-stat-card__value" id="stat-new-users">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">login</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_logins'); ?></span>
                        <span class="component-stat-card__value" id="stat-logins">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">visibility</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_pageviews'); ?></span>
                        <span class="component-stat-card__value" id="stat-pageviews">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">speed</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_avg_latency'); ?></span>
                        <span class="component-stat-card__value" id="stat-latency">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">chat</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_total_messages'); ?></span>
                        <span class="component-stat-card__value" id="stat-messages">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">brush</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_total_canvases'); ?></span>
                        <span class="component-stat-card__value" id="stat-canvases">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">block</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_suspended_users'); ?></span>
                        <span class="component-stat-card__value" id="stat-banned">--</span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">attach_money</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_ad_revenue'); ?></span>
                        <span class="component-stat-card__value"><?php echo __('admin_dashboard_requires_api'); ?></span>
                    </div>
                </div>

                <div class="component-item-card component-stat-card">
                    <div class="component-card__icon-container component-card__icon-container--bordered component-stat-card__icon">
                        <span class="material-symbols-rounded">info</span>
                    </div>
                    <div class="component-stat-card__content">
                        <span class="component-stat-card__title"><?php echo __('admin_dashboard_system_version'); ?></span>
                        <span class="component-stat-card__value">v<?php echo $_ENV['APP_VERSION']; ?></span>
                    </div>
                </div>
            </div>

            <!-- Div de datos para traducciones de JS -->
            <div id="dashboard-lang-data" class="disabled"
                 data-lbl-activity="<?php echo __('admin_dashboard_global_activity'); ?>"
                 data-lbl-regs="<?php echo __('admin_dashboard_new_registrations'); ?>"
                 data-lbl-errors="<?php echo __('admin_dashboard_access_errors'); ?>"
                 data-lbl-pageviews="<?php echo __('admin_dashboard_pageviews'); ?>"
                 data-lbl-logins="<?php echo __('admin_dashboard_logins'); ?>"
                 data-lbl-newusers="<?php echo __('admin_dashboard_new_users'); ?>"
                 data-lbl-loginfails="<?php echo __('admin_dashboard_login_fails'); ?>">
            </div>

            <div class="dashboard-chart-card">
                <!-- Header del Chart Card -->
                <div class="dashboard-chart-header">
                    <h1 class="component-top-title"><?php echo __('admin_dashboard_detailed_metrics'); ?></h1>
                    
                    <div class="component-dropdown-wrapper">
                        <div class="component-dropdown-trigger" data-action="toggleModule" data-target="moduleChartMode">
                            <span class="material-symbols-rounded" id="chart-dropdown-icon">monitoring</span>
                            <span class="component-dropdown-text" id="chart-dropdown-text"><?php echo __('admin_dashboard_global_activity'); ?></span>
                            <span class="material-symbols-rounded">expand_more</span>
                        </div>
                        <div class="component-module component-module--dropdown component-module--dropdown-left disabled" data-module="moduleChartMode">
                            <div class="component-menu component-menu--w-full component-menu--h-auto component-menu--no-padding component-menu--limited">
                                <div class="pill-container"><div class="drag-handle"></div></div>
                                <div class="component-menu-list component-menu-list--scrollable">
                                    
                                    <div class="component-menu-link active" id="menu-tab-act" onclick="window.dashboardController.switchTab('activity')">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">monitoring</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('admin_dashboard_global_activity'); ?></span></div>
                                    </div>
                                    
                                    <div class="component-menu-link" id="menu-tab-reg" onclick="window.dashboardController.switchTab('regs')">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">person_add</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('admin_dashboard_new_registrations'); ?></span></div>
                                    </div>

                                    <div class="component-menu-link" id="menu-tab-err" onclick="window.dashboardController.switchTab('errors')">
                                        <div class="component-menu-link-icon"><span class="material-symbols-rounded">warning</span></div>
                                        <div class="component-menu-link-text"><span><?php echo __('admin_dashboard_access_errors'); ?></span></div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                
                <!-- Body del Chart Card -->
                <div class="dashboard-chart-body">
                    <canvas id="chartTabsMain"></canvas>
                </div>
            </div>

        </div> 
    </div>
</div>