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

            <div class="component-card--grouped component-card--elevated component-spacing--top-lg active" data-ref="devices-container">
            </div>

        </div>
    </div>
</div>