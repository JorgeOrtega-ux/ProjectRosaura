<div class="component-layout-centered">
    <div class="component-form-box">
        
        <div class="component-form-header">
            <h1 class="component-form-title"><?php echo __('forgot_title'); ?></h1>
            <p class="component-form-desc"><?php echo __('forgot_desc'); ?></p>
        </div>

        <div class="component-form-body">
            
            <div class="component-input-group">
                <input type="email" data-ref="forgot_email" name="email" class="component-input-field" placeholder=" ">
                <label class="component-input-label"><?php echo __('lbl_email'); ?></label>
            </div>

            <button class="component-button component-button--dark component-button--h45 component-button--full" data-ref="btn-forgot-password" data-action="submitForgotPassword">
                <?php echo __('btn_continue'); ?>
            </button>
            
            <div class="component-alert-error" data-ref="auth-error-message"></div>
            <div class="component-alert-success" data-ref="auth-success-message"></div>

            <div class="component-link-container component-link-container--center">
                <span class="component-link" data-nav="<?php echo APP_URL; ?>/login"><?php echo __('link_back_login'); ?></span>
            </div>

        </div>

    </div>
</div>