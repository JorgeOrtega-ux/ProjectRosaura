<?php
use App\Config\Database;

$token = $_GET['token'] ?? '';
$isValid = false;

if (!empty($token)) {
    $db = new Database();
    $pdo = $db->getConnection();
    
    // Verificamos si existe un token de reseteo válido y que no haya expirado
    $stmt = $pdo->prepare("SELECT id FROM verification_codes WHERE code = ? AND code_type = 'password_reset' AND expires_at > NOW()");
    $stmt->execute([$token]);
    
    if ($stmt->rowCount() > 0) {
        $isValid = true;
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
            </div>

            <div class="component-form-body">
                
                <input type="hidden" id="reset_token" value="<?php echo htmlspecialchars($token); ?>">

                <div class="component-input-group">
                    <input type="password" id="new_password" name="password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label for="new_password" class="component-input-label"><?php echo __('lbl_new_password'); ?></label>
                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                </div>

                <div class="component-input-group">
                    <input type="password" id="confirm_password" name="confirm_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                    <label for="confirm_password" class="component-input-label"><?php echo __('lbl_confirm_password'); ?></label>
                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                </div>

                <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitResetPassword">
                    <?php echo __('btn_save_password'); ?>
                </button>
                
                <div class="component-alert-error" id="auth-error-message"></div>
                <div class="component-alert-success" id="auth-success-message"></div>

            </div>
        <?php endif; ?>

    </div>
</div>