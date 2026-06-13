<?php
// includes/views/settings/profile/delete-account.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">

    <div class="component-top">
        <div class="component-top-left">
            <h1 class="component-top-title"><?php echo __('del_acc_title'); ?></h1>
        </div>
        <div class="component-top-right">
            <button class="component-button component-button--h40 component-button--danger disabled-interaction" data-action="promptDeleteAccount" data-ref="btn-top-delete">
                <?php echo __('btn_delete_account_final'); ?>
            </button>
        </div>
    </div>

    <div class="component-viewport">
        <div class="component-wrapper">
            <div class="component-bottom">
                
                <div class="component-card--grouped">

                    <div class="component-group-item component-group-item--stacked">
                        <div class="component-card__content component-card__content--full component-card__content--start">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">schedule</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('del_acc_grace_period_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('del_acc_grace_period_desc'); ?></p>
                            </div>
                        </div>
                    </div>

                    <hr class="component-divider">

                    <div class="component-group-item component-group-item--wrap">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">fact_check</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title"><?php echo __('del_acc_confirm_title'); ?></h2>
                                <p class="component-card__description"><?php echo __('del_acc_confirm_desc'); ?></p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <label class="component-toggle-switch">
                                <input type="checkbox" data-ref="chk_confirm_delete">
                                <span class="component-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </div>
</div>