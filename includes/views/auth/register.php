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

// Validación de protección de acceso directo
if ($relativePath === '/register/aditional-data') {
    if (empty($_SESSION['reg_email']) || empty($_SESSION['reg_password'])) {
        $errorMsg = __('reg_no_data');
    }
} elseif ($relativePath === '/register/verification-account') {
    if (empty($_SESSION['reg_email']) || empty($_SESSION['reg_username'])) {
        $errorMsg = __('reg_no_data');
    }
}
?>

<div class="component-layout-centered">
    <div class="component-form-box">
        
        <?php if ($errorMsg): ?>
            <div class="component-form-header">
                <h1 class="component-form-title" style="color: #d32f2f;"><?php echo __('reg_access_denied'); ?></h1>
                <p class="component-form-desc"><?php echo htmlspecialchars($errorMsg); ?></p>
            </div>
            <div class="component-form-body">
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-nav="/ProjectRosaura/register">
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
                        <input type="email" id="email" name="email" class="component-input-field" placeholder=" ">
                        <label for="email" class="component-input-label"><?php echo __('lbl_email'); ?></label>
                    </div>

                    <div class="component-input-group">
                        <input type="password" id="password" name="password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                        <label for="password" class="component-input-label"><?php echo __('lbl_password'); ?></label>
                        <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                    </div>

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitRegisterStep1">
                        <?php echo __('btn_continue'); ?>
                    </button>
                    
                    <div class="component-alert-error" id="auth-error-message"></div>

                    <div class="component-link-container component-link-container--center">
                        <span class="component-link-text"><?php echo __('txt_has_account'); ?></span>
                        <span class="component-link" data-nav="/ProjectRosaura/login"><?php echo __('link_login'); ?></span>
                    </div>
                </div>

            <?php elseif ($relativePath === '/register/aditional-data'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title"><?php echo __('reg_step2_title'); ?></h1>
                    <p class="component-form-desc"><?php echo __('reg_step2_desc'); ?></p>
                </div>

                <div class="component-form-body">
                    <div class="component-input-group">
                        <input type="text" id="username" name="username" class="component-input-field" placeholder=" ">
                        <label for="username" class="component-input-label"><?php echo __('lbl_username'); ?></label>
                    </div>

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitRegisterStep2">
                        <?php echo __('btn_continue'); ?>
                    </button>
                    
                    <div class="component-alert-error" id="auth-error-message"></div>

                    <div class="component-link-container component-link-container--center">
                        <span class="component-link" data-nav="/ProjectRosaura/register"><?php echo __('link_go_back'); ?></span>
                    </div>
                </div>

            <?php elseif ($relativePath === '/register/verification-account'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title"><?php echo __('reg_step3_title'); ?></h1>
                    <p class="component-form-desc"><?php echo __('reg_step3_desc'); ?></p>
                </div>

                <div class="component-form-body">
                    <div class="component-input-group">
                        <input type="text" id="verification_code" name="verification_code" class="component-input-field" placeholder=" " maxlength="14">
                        <label for="verification_code" class="component-input-label"><?php echo __('lbl_verify_code'); ?></label>
                    </div>

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitRegisterVerify">
                        <?php echo __('btn_create_account'); ?>
                    </button>
                    
                    <div class="component-alert-error" id="auth-error-message"></div>
                    
                    <div class="component-link-container component-link-container--center">
                        <span class="component-link" data-nav="/ProjectRosaura/register/aditional-data"><?php echo __('link_go_back'); ?></span>
                    </div>
                </div>
            <?php endif; ?>

        <?php endif; ?>
    </div>
</div>