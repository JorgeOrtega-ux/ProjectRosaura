<?php
// includes/views/admin/dashboard.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-sticky-toolbar">
            <div class="component-toolbar-primary">
                <div class="component-toolbar-mode active">
                    <div class="component-toolbar-left">
                        </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--dark component-button--icon component-button--h40" data-nav="<?php echo APP_URL; ?>/admin/logs" title="<?php echo __('btn_view_logs'); ?>">
                            <span class="material-symbols-rounded">receipt_long</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('admin_dashboard_title'); ?></h1>
            <p class="component-page-description"><?php echo __('admin_dashboard_desc'); ?></p>
        </div>
        
        <div class="component-card--grouped">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    <div class="component-card__text">
                        <p class="component-card__description"><?php echo __('admin_dashboard_analytics_placeholder'); ?></p>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>