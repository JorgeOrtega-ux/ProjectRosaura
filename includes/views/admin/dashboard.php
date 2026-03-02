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
                        <span class="component-toolbar-title" style="border: none; padding-left: 4px; font-size: 16px;">Acciones Rápidas</span>
                    </div>
                    <div class="component-toolbar-right">
                        <button class="component-button component-button--dark component-button--h40" data-nav="/ProjectRosaura/admin/logs">
                            <span class="material-symbols-rounded">receipt_long</span> Ver Logs
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
                        <p class="component-card__description">Espacio reservado para las analíticas generales.</p>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>