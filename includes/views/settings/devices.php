<?php
// includes/views/settings/devices.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('devices_title'); ?></h1>
            <p class="component-page-description"><?php echo __('devices_desc'); ?></p>
        </div>

        <div class="component-card--grouped active" data-ref="devices-container">
            
            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">devices</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('devices_active_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('devices_active_desc'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button class="component-button component-button--danger component-button--h36" data-action="revokeAllDevices">
                        <span class="material-symbols-rounded">logout</span> <?php echo __('btn_revoke_all'); ?>
                    </button>
                </div>
            </div>
            
            </div>

    </div>
</div>