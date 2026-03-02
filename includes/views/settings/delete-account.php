<?php
// includes/views/settings/delete-account.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('del_acc_title'); ?></h1>
            <p class="component-page-description"><?php echo __('del_acc_desc'); ?></p>
        </div>
        
        <div class="component-card--grouped">
            
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">warning</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('del_acc_irreversible_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('del_acc_warning'); ?></p>
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
                        <p class="component-card__description"><?php echo __('lbl_confirm_delete'); ?></p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="chk_confirm_delete">
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div id="delete_password_area" class="disabled">
                <hr class="component-divider">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">lock</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title"><?php echo __('admin_verify_identity_title'); ?></h2>
                            <p class="component-card__description"><?php echo __('del_acc_verify_desc'); ?></p>
                            
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="password" id="delete_account_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                    <label for="delete_account_password" class="component-input-label"><?php echo __('lbl_password'); ?></label>
                                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/security"><?php echo __('btn_cancel'); ?></button>
                        <button class="component-button component-button--h36 component-button--danger" data-action="submitDeleteAccount"><?php echo __('btn_delete_account_final'); ?></button>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>