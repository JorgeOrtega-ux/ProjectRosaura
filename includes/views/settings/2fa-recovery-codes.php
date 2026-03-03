<?php
// includes/views/settings/2fa-recovery-codes.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('2fa_recovery_title'); ?></h1>
            <p class="component-page-description"><?php echo __('2fa_recovery_desc'); ?></p>
        </div>

        <div class="component-card--grouped active" id="step-1-generate-codes">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">lock</span>
                    </div>

                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('admin_verify_identity_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('2fa_recovery_verify_desc'); ?></p>
                        
                        <div class="component-card__form-area">
                            <div class="component-input-group">
                                <input type="password" id="2fa_regenerate_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                <label for="2fa_regenerate_password" class="component-input-label"><?php echo __('lbl_current_password'); ?></label>
                                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button class="component-button component-button--h36" data-nav="<?php echo APP_URL; ?>/settings/2fa"><?php echo __('btn_cancel'); ?></button>
                    <button class="component-button component-button--h36 component-button--dark" data-action="submitRegenerateRecoveryCodes"><?php echo __('btn_confirm'); ?></button>
                </div>
            </div>
        </div>

        <div class="component-card--grouped disabled" id="2fa-new-recovery-codes-wrapper">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">shield</span>
                    </div>

                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('2fa_new_codes_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('2fa_new_codes_desc'); ?></p>
                        
                        <div id="2fa-new-recovery-codes-list">
                            </div>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button class="component-button component-button--h36" data-action="copyNewRecoveryCodes"><?php echo __('btn_copy_codes'); ?></button>
                    <button class="component-button component-button--h36 component-button--dark" data-nav="<?php echo APP_URL; ?>/settings/2fa"><?php echo __('btn_finish'); ?></button>
                </div>
            </div>
        </div>

    </div>
</div>