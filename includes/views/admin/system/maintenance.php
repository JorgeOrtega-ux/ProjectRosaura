<?php
// includes/views/admin/system/maintenance.php
?>
<div class="view-content system-maintenance-view">
    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('admin_maintenance_title_main'); ?></h1>
                <p class="component-page-description"><?php echo __('admin_maintenance_desc_main'); ?></p>
            </div>

            <div class="component-card--grouped">
                
                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">logout</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_maintenance_flush_sessions_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_maintenance_flush_sessions_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--danger component-button--h36" data-action="flushSessions">
                            <?php echo __('btn_flush_sessions'); ?>
                        </button>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">memory</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_maintenance_clear_cache_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_maintenance_clear_cache_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--secondary component-button--h36" data-action="clearCache">
                            <?php echo __('btn_clear_cache'); ?>
                        </button>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">speed</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_maintenance_reset_limits_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('admin_maintenance_reset_limits_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--secondary component-button--h36" data-action="resetRateLimits">
                            <?php echo __('btn_reset_limits'); ?>
                        </button>
                    </div>
                </div>

            </div>
        </div>

    </div>
</div>