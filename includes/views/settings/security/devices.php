<?php
// includes/views/settings/security/devices.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">

            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('devices_title'); ?></h1>
                <p class="component-page-description"><?php echo __('devices_desc'); ?></p>
            </div>

            <div class="component-card--grouped active" data-ref="devices-container" style="border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-top: 1.5rem;">
            </div>

        </div>
    </div>
</div>