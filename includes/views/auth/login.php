<div class="component-layout-centered">
    <div class="component-form-box">
        
        <div class="component-form-header">
            <h1 class="component-form-title"><?php echo __('login_title'); ?></h1>
            <p class="component-form-desc"><?php echo __('login_desc'); ?></p>
        </div>

        <div class="component-form-body">
            
            <div class="component-input-group">
                <input type="email" id="email" name="email" class="component-input-field" placeholder=" ">
                <label for="email" class="component-input-label"><?php echo __('lbl_email'); ?></label>
            </div>

            <div class="component-input-group">
                <input type="password" id="password" name="password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                <label for="password" class="component-input-label"><?php echo __('lbl_password'); ?></label>
                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
            </div>

            <div class="component-link-container component-link-container--right">
                <span class="component-link" data-nav="/ProjectRosaura/forgot-password"><?php echo __('link_forgot_password'); ?></span>
            </div>

            <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitLogin">
                <?php echo __('btn_continue'); ?>
            </button>
            
            <div class="component-alert-error" id="auth-error-message"></div>

            <div class="component-link-container component-link-container--center">
                <span class="component-link-text"><?php echo __('txt_no_account'); ?></span>
                <span class="component-link" data-nav="/ProjectRosaura/register"><?php echo __('link_create_account'); ?></span>
            </div>

        </div>

    </div>
</div>