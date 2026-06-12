<?php
// includes/views/auth/reset-password.php

use App\Core\Container;
use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use App\Core\System\DatabaseConstants;

$token = $_GET['token'] ?? '';
$isValid = false;
$userEmail = '';

// CORRECCIÓN: Usar el repositorio a través del contenedor en lugar de consultar PDO directamente,
// ya que el sistema utiliza Redis para almacenar los códigos de verificación temporalmente.
if (!empty($token)) {
    try {
        // Aseguramos tener acceso al contenedor global inicializado en bootstrap.php
        global $container;
        if (!isset($container)) {
            $container = new Container();
        }
        
        $verificationRepo = $container->get(VerificationCodeRepositoryInterface::class);
        
        // Buscamos el token usando el método oficial de la interfaz
        $verification = $verificationRepo->findValidByCodeAndType($token, DatabaseConstants::VERIFY_TYPE_PASSWORD);
        
        if ($verification) {
            $isValid = true;
            $payload = json_decode($verification['payload'], true);
            if (isset($payload['email'])) {
                $userEmail = $payload['email'];
            }
        }
    } catch (\Exception $e) {
        $isValid = false;
    }
}
?>
<div class="component-layout-centered">
    <div class="component-form-box">
        
        <?php if (!$isValid): ?>
            <div class="component-form-header">
                <h1 class="component-form-title"><?php echo __('reset_invalid_title'); ?></h1>
                <p class="component-form-desc"><?php echo __('reset_invalid_desc'); ?></p>
            </div>
            
            <div class="component-form-body">
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-nav="<?php echo APP_URL; ?>/forgot-password">
                    <?php echo __('btn_try_again'); ?>
                </button>
                <div class="component-link-container component-link-container--center">
                    <span class="component-link" data-nav="<?php echo APP_URL; ?>/login"><?php echo __('link_go_login'); ?></span>
                </div>
            </div>
        <?php else: ?>
            <div class="component-form-header">
                <h1 class="component-form-title"><?php echo __('reset_title'); ?></h1>
                <p class="component-form-desc"><?php echo __('reset_desc'); ?></p>
                
                <?php if (!empty($userEmail)): ?>
                <div style="margin-top: 15px; display: inline-flex; align-items: center; background-color: var(--color-surface, #f5f5fa); padding: 6px 14px; border-radius: 20px; font-size: 13px; color: var(--color-text-secondary, #666); border: 1px solid var(--color-border, #00000020);">
                    <span class="material-symbols-rounded" style="font-size: 16px; margin-right: 6px;">mail</span>
                    <span style="font-weight: 500;"><?php echo htmlspecialchars($userEmail); ?></span>
                </div>
                <?php endif; ?>
            </div>

            <div class="component-form-body">
                
                <input type="hidden" data-ref="reset_token" value="<?php echo htmlspecialchars($token); ?>">

                <div class="component-input-group">
                    <input type="password" data-ref="new_password" name="password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label class="component-input-label"><?php echo __('lbl_new_password'); ?></label>
                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                </div>

                <div class="component-input-group">
                    <input type="password" data-ref="confirm_password" name="confirm_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label class="component-input-label"><?php echo __('lbl_confirm_password'); ?></label>
                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                </div>

                <?php echo \App\Core\Helpers\Utils::renderTurnstile('reset_password'); ?>

                <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitResetPassword">
                    <?php echo __('btn_save_password'); ?>
                </button>
                
                <div class="component-alert-error" data-ref="auth-error-message"></div>
                <div class="component-alert-success" data-ref="auth-success-message"></div>

            </div>
        <?php endif; ?>

    </div>
</div>