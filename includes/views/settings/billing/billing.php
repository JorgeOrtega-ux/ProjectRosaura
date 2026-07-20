<?php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content">
    <div class="component-wrapper">
        <div class="component-bottom">
            
            <div class="component-header-card">
                <h1 class="component-page-title"><?php echo __('billing_title'); ?></h1>
                <p class="component-page-description"><?php echo __('manage_billing_desc'); ?></p>
            </div>

            <div class="component-card--grouped" data-ref="subscription-storage-area">
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">credit_card</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('payment_methods_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('manage_billing_desc'); ?></p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--dark component-button--h36" data-action="addNewCard" data-tooltip="<?php echo __('tooltip_add_card'); ?>" data-position="bottom">
                            <span class="material-symbols-rounded">add</span>
                            <?php echo __('btn_add'); ?>
                        </button>
                    </div>
                </div>

                <hr class="component-divider">

                <div class="component-group-item component-group-item--stacked" data-ref="payment-methods-area">
                </div>
            </div>

        </div>
    </div>
</div>