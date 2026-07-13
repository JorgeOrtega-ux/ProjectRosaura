<?php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('menu_subscription'); ?></h1>
                <p class="component-page-description"><?= __('manage_billing_desc') ?></p>
            </div>

                        <div class="component-card--grouped" data-ref="subscription-content-area">
                            </div>
        </div>
    </div>
</div>
