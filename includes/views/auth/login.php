<?php
// includes/views/auth/login.php
// Resolvemos la ruta actual para saber qué etapa mostrar
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$appUrlPath = parse_url(defined('APP_URL') ? APP_URL : '', PHP_URL_PATH) ?: '';

// Removemos el subdirectorio (si existe) de la URI para obtener la ruta relativa real
$relativePath = $requestUri;
if ($appUrlPath !== '' && $appUrlPath !== '/' && strpos($requestUri, $appUrlPath) === 0) {
    $relativePath = substr($requestUri, strlen($appUrlPath));
}

if ($relativePath === '' || $relativePath === false) {
    $relativePath = '/';
}
if (strlen($relativePath) > 1 && substr($relativePath, -1) === '/') {
    $relativePath = rtrim($relativePath, '/');
}

$errorMsg = null;

// Validación de protección de acceso directo al paso del 2FA
if ($relativePath === '/login/two-factor') {
    // FIX: Buscar en el array correcto que genera AuthServices.php
    $sessionKey = defined('\App\Core\System\SessionConstants::KEY_PENDING_2FA') 
                  ? \App\Core\System\SessionConstants::KEY_PENDING_2FA 
                  : 'pending_2fa';
                  
    $pending2FA = $_SESSION[$sessionKey] ?? [];
    
    if (empty($pending2FA)) {
        $errorMsg = __('reg_no_data'); // Reutilizamos el mensaje de 'No hay datos previos...'
    }
}

// LOGICA MULTI-SESIÓN: Determinar si es un Login normal o "Añadir Cuenta"
$linkedAccounts = $_SESSION['accounts'] ?? [];
$isMultiSessionAdd = count($linkedAccounts) > 0;
?>

<div class="component-layout-centered">
    <div class="component-form-box">
        
        <?php if ($errorMsg): ?>
            <div class="component-form-header">
                <h1 class="component-form-title component-text-notice--error"><?php echo __('reg_access_denied'); ?></h1>
                <p class="component-form-desc"><?php echo htmlspecialchars($errorMsg); ?></p>
            </div>
            <div class="component-form-body">
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-nav="<?php echo APP_URL; ?>/login">
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
                        <input type="text" data-ref="2fa_code" name="2fa_code" class="component-input-field" placeholder=" " maxlength="8" autocomplete="one-time-code">
                        <label class="component-input-label"><?php echo __('lbl_2fa_code'); ?></label>
                    </div>

                    <?php echo \App\Core\Helpers\Utils::renderTurnstile('login_2fa'); ?>

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitLogin2FA">
                        <?php echo __('btn_verify_login'); ?>
                    </button>
                    
                    <div class="component-alert-error" data-ref="auth-error-message"></div>

                    <div class="component-link-container component-link-container--center">
                        <span class="component-link" data-nav="<?php echo APP_URL; ?>/login"><?php echo __('link_back_to_login'); ?></span>
                    </div>
                </div>

            <?php else: ?>
                <div class="component-form-header">
                    <h1 class="component-form-title"><?php echo $isMultiSessionAdd ? __('login_add_account_title') : __('login_title'); ?></h1>
                    <p class="component-form-desc"><?php echo $isMultiSessionAdd ? __('login_add_account_desc') : __('login_desc'); ?></p>
                </div>

                <div class="component-form-body">
                    
                    <div class="component-input-group">
                        <input type="email" data-ref="email" name="email" class="component-input-field" placeholder=" ">
                        <label class="component-input-label"><?php echo __('lbl_email'); ?></label>
                    </div>

                    <div class="component-input-group">
                        <input type="password" data-ref="password" name="password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                        <label class="component-input-label"><?php echo __('lbl_password'); ?></label>
                        <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                    </div>

                    <div class="component-link-container component-link-container--right">
                        <span class="component-link" data-nav="<?php echo APP_URL; ?>/forgot-password"><?php echo __('link_forgot_password'); ?></span>
                    </div>

                    <?php echo \App\Core\Helpers\Utils::renderTurnstile('login'); ?>

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitLogin">
                        <?php echo __('btn_continue'); ?>
                    </button>
                    
                    <div class="component-alert-error" data-ref="auth-error-message"></div>

                    <?php if ($isMultiSessionAdd): ?>
                        <div class="component-link-container component-link-container--center">
                            <span class="component-link" data-nav="<?php echo APP_URL; ?>/"><?php echo __('link_cancel_return_home'); ?></span>
                        </div>
                    <?php else: ?>
                        <div class="component-link-container component-link-container--center">
                            <span class="component-link-text"><?php echo __('txt_no_account'); ?></span>
                            <span class="component-link" data-nav="<?php echo APP_URL; ?>/register"><?php echo __('link_create_account'); ?></span>
                        </div>
                    <?php endif; ?>

                </div>
            <?php endif; ?>

        <?php endif; ?>
    </div>
</div>