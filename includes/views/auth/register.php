<?php
use App\Api\Services\Auth\AuthViewService;

$authService = new AuthViewService();
$registerData = $authService->getRegisterViewData();

$relativePath = $registerData['relativePath'];
$errorMsg = $registerData['errorMsg'];
$maxUsernameLen = $registerData['maxUsernameLen'];
$maxPasswordLen = $registerData['maxPasswordLen'];
?>

<div class="component-layout-centered">
    <?php include __DIR__ . '/auth-logo.php'; ?>
    <div class="component-form-box">
        
        <?php if ($errorMsg): ?>
            <div class="component-form-header">
                <h1 class="component-form-title"><?php echo __('reg_access_denied'); ?></h1>
                <p class="component-form-desc"><?php echo htmlspecialchars($errorMsg); ?></p>
            </div>
            <div class="component-form-body">
                <button class="component-button component-button--h45 component-button--full" data-nav="<?php echo APP_URL; ?>/register">
                    <?php echo __('btn_back_home'); ?>
                </button>
            </div>
        <?php else: ?>

            <?php if ($relativePath === '/register'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title"><?php echo __('reg_step1_title'); ?></h1>
                    <p class="component-form-desc"><?php echo __('reg_step1_desc'); ?></p>
                </div>

                <div class="component-form-body">
                    <div class="component-input-group">
                        <input type="email" data-ref="email" name="email" class="component-input-field" placeholder=" " maxlength="254">
                        <label class="component-input-label"><?php echo __('lbl_email'); ?></label>
                    </div>

                    <div class="component-input-group">
                        <input type="password" data-ref="password" name="password" class="component-input-field component-input-field--with-icon" placeholder=" " maxlength="<?php echo htmlspecialchars($maxPasswordLen); ?>">
                        <label class="component-input-label"><?php echo __('lbl_password'); ?></label>
                        <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                    </div>

                    <?php echo \App\Core\Helpers\Utils::renderTurnstile('register'); ?>

                    <button class="component-button component-button--primary component-button--h45 component-button--full" data-action="submitRegisterStep1">
                        <?php echo __('btn_continue'); ?>
                    </button>
                    
                    <!-- GOOGLE SIGN-IN -->
                    <?php if(!empty($_ENV['GOOGLE_CLIENT_ID'])): ?>
                    <script>
                        window.GOOGLE_CLIENT_ID = "<?php echo $_ENV['GOOGLE_CLIENT_ID']; ?>";
                    </script>
                    <script src="https://accounts.google.com/gsi/client" async defer></script>
                    
                    <button type="button" class="component-button component-button--h45 component-button--full" data-action="customGoogleLogin">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.222 0-9.654-3.343-11.303-8l-6.571 4.819C9.656 39.663 16.318 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                        <?php echo __('btn_register_google'); ?>
                    </button>
                    <?php endif; ?>
                    
                    <div class="component-alert-error" data-ref="auth-error-message"></div>

                    <div class="component-link-container component-link-container--center">
                        <span class="component-link-text"><?php echo __('txt_has_account'); ?></span>
                        <span class="component-link" data-nav="<?php echo APP_URL; ?>/login"><?php echo __('link_login'); ?></span>
                    </div>
                </div>

            <?php elseif ($relativePath === '/register/aditional-data'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title"><?php echo __('reg_step2_title'); ?></h1>
                    <p class="component-form-desc"><?php echo __('reg_step2_desc'); ?></p>
                </div>

                <div class="component-form-body">
                    <div class="component-input-group">
                        <input type="text" data-ref="username" name="username" class="component-input-field component-input-field--with-icon" placeholder=" " maxlength="<?php echo htmlspecialchars($maxUsernameLen); ?>">
                        <label class="component-input-label"><?php echo __('lbl_username'); ?></label>
                        <span class="material-symbols-rounded component-input-toggle" data-action="generateUsername" title="<?php echo __('title_generate_username'); ?>">auto_awesome</span>
                    </div>

                    <button class="component-button component-button--primary component-button--h45 component-button--full" data-action="submitRegisterStep2">
                        <?php echo __('btn_continue'); ?>
                    </button>
                    
                    <div class="component-alert-error" data-ref="auth-error-message"></div>

                    <div class="component-link-container component-link-container--center">
                        <span class="component-link" data-nav="<?php echo APP_URL; ?>/register"><?php echo __('link_go_back'); ?></span>
                    </div>
                </div>

            <?php elseif ($relativePath === '/register/verification-account'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title"><?php echo __('reg_step3_title'); ?></h1>
                    <p class="component-form-desc"><?php echo __('reg_step3_desc'); ?></p>
                </div>

                <div class="component-form-body">
                    <div class="component-input-group">
                        <input type="text" data-ref="verification_code" name="verification_code" class="component-input-field" placeholder=" " maxlength="14">
                        <label class="component-input-label"><?php echo __('lbl_verify_code'); ?></label>
                    </div>

                    <button class="component-button component-button--primary component-button--h45 component-button--full" data-action="submitRegisterVerify">
                        <?php echo __('btn_create_account'); ?>
                    </button>
                    
                    <div class="component-alert-error" data-ref="auth-error-message"></div>
                    <div class="component-alert-success" data-ref="auth-success-message"></div>
                    
                    <div class="component-link-container component-link-container--center">
                        <span class="component-link" data-ref="btn-resend-register-code" data-action="resendRegisterCode"><?php echo __('btn_resend_code'); ?></span>
                    </div>
                </div>
            <?php endif; ?>

        <?php endif; ?>
    </div>
</div>