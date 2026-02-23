<?php
// includes/views/settings/change-password.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('cp_title'); ?></h1>
            <p class="component-page-description"><?php echo __('cp_desc'); ?></p>
        </div>

        <div class="component-card--grouped active" id="step-1-current-password">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">lock</span>
                    </div>

                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('cp_step1_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('cp_step1_desc'); ?></p>
                        
                        <div class="component-card__form-area">
                            <div class="component-input-group">
                                <input type="password" id="cp_current_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                <label for="cp_current_password" class="component-input-label"><?php echo __('lbl_current_password'); ?></label>
                                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/security"><?php echo __('btn_cancel'); ?></button>
                    <button class="component-button component-button--h36 component-button--dark" data-action="submitVerifyCurrentPassword"><?php echo __('btn_verify'); ?></button>
                </div>
            </div>
        </div>

        <div class="component-card--grouped disabled" id="step-2-new-password">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">lock_reset</span>
                    </div>

                    <div class="component-card__text">
                        <h2 class="component-card__title"><?php echo __('cp_step2_title'); ?></h2>
                        <p class="component-card__description"><?php echo __('cp_step2_desc'); ?></p>
                        
                        <div class="component-card__form-area">
                            <div class="component-input-group">
                                <input type="password" id="cp_new_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                <label for="cp_new_password" class="component-input-label"><?php echo __('lbl_new_password'); ?></label>
                                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                            </div>

                            <div class="component-input-group">
                                <input type="password" id="cp_confirm_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                <label for="cp_confirm_password" class="component-input-label"><?php echo __('lbl_confirm_password'); ?></label>
                                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/security"><?php echo __('btn_cancel'); ?></button>
                    <button class="component-button component-button--h36 component-button--dark" data-action="submitUpdatePassword"><?php echo __('btn_save_password'); ?></button>
                </div>
            </div>
        </div>

    </div>
</div>