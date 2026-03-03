<?php
// Resolvemos la ruta actual para saber qué etapa mostrar
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$basePath = '/ProjectRosaura';
$relativePath = substr($requestUri, strlen($basePath));
if ($relativePath === '' || $relativePath === false) {
    $relativePath = '/';
}
if (strlen($relativePath) > 1 && substr($relativePath, -1) === '/') {
    $relativePath = rtrim($relativePath, '/');
}

$errorMsg = null;

// Validación de protección de acceso directo al paso del 2FA
if ($relativePath === '/login/two-factor') {
    if (empty($_SESSION['pending_2fa_user_id'])) {
        $errorMsg = __('reg_no_data'); // Reutilizamos el mensaje de 'No hay datos previos...'
    }
}
?>

<div class="component-layout-centered">
    <div class="component-form-box">
        
        <?php if ($errorMsg): ?>
            <div class="component-form-header">
                <h1 class="component-form-title component-text-notice--error"><?php echo __('reg_access_denied'); ?></h1>
                <p class="component-form-desc"><?php echo htmlspecialchars($errorMsg); ?></p>
            </div>
            <div class="component-form-body">
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-nav="/ProjectRosaura/login">
                    <?php echo __('link_back_login'); ?>
                </button>
            </div>
        <?php else: ?>
        
            <?php if ($relativePath === '/login/two-factor'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title"><?php echo __('login_2fa_title'); ?></h1>
                    <p class="component-form-desc"><?php echo __('login_2fa_desc'); ?></p>
                </div>

                <div class="component-form-body">
                    <div class="component-input-group">
                        <input type="text" id="2fa_code" name="2fa_code" class="component-input-field" placeholder=" " maxlength="8" autocomplete="one-time-code">
                        <label for="2fa_code" class="component-input-label"><?php echo __('lbl_2fa_code'); ?></label>
                    </div>

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitLogin2FA">
                        <?php echo __('btn_verify_login'); ?>
                    </button>
                    
                    <div class="component-alert-error" id="auth-error-message"></div>

                    <div class="component-link-container component-link-container--center">
                        <span class="component-link" data-nav="/ProjectRosaura/login"><?php echo __('link_back_to_login'); ?></span>
                    </div>
                </div>

            <?php else: ?>
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
            <?php endif; ?>

        <?php endif; ?>
    </div>
</div>