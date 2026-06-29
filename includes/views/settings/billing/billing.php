<?php
// includes/views/settings/billing.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>

<div class="view-content">
    <div class="component-wrapper component-wrapper--full no-padding" data-ref="billing-wrapper">
        
        <div class="component-top">
            <div class="component-top-left">
                <h1 class="component-top-title"><?php echo __('billing_title'); ?></h1>
            </div>
            
            <div class="component-top-right">
                <div class="component-actions active">
                    <button class="component-button component-button--dark component-button--h40" data-tooltip="<?php echo __('tooltip_add_card'); ?>" data-position="bottom" data-action="addNewCard">
                        <span class="material-symbols-rounded">add</span>
                        <?php echo __('btn_add'); ?>
                    </button>
                </div>
            </div>
        </div>

        <!-- Se aplica la caja dinámica como contenedor exclusivo -->
        <div class="component-bottom" style="padding: 0;" data-ref="dynamic-content-area">
            <!-- JS inyectará el grid de tarjetas o el component-empty-state aquí -->
        </div>

    </div>
</div>