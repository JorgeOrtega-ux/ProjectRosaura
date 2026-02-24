<?php
// includes/views/settings/2fa.php
if (session_status() === PHP_SESSION_NONE) session_start();
$is2FAActive = !empty($_SESSION['user_2fa']);
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('2fa_title'); ?></h1>
            <p class="component-page-description"><?php echo __('2fa_desc'); ?></p>
        </div>

        <?php if (!$is2FAActive): ?>
            <div class="component-card--grouped active" id="2fa-setup-container">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        <div class="component-card__text">
                            <h2 class="component-card__title">1. Escanea el código QR</h2>
                            <p class="component-card__description">Abre tu aplicación de autenticación (como Google Authenticator o Authy) y escanea el siguiente código.</p>
                            
                            <div style="margin: 16px 0; text-align: center; width: 100%;">
                                <img id="2fa-qr-img" src="" alt="Código QR" style="width: 200px; height: 200px; border: 1px solid #00000020; border-radius: 8px; padding: 8px; background: #fff;">
                            </div>

                            <h2 class="component-card__title">2. Ingresa la clave manualmente</h2>
                            <p class="component-card__description">Si no puedes escanear el código, ingresa esta clave en tu app:</p>
                            <div style="background: #f5f5fa; padding: 12px; border-radius: 8px; font-family: monospace; letter-spacing: 2px; text-align: center; font-size: 16px; margin: 12px 0;">
                                <strong id="2fa-secret-text">CARGANDO...</strong>
                            </div>

                            <h2 class="component-card__title">3. Verifica el código</h2>
                            <p class="component-card__description">Ingresa el código de 6 dígitos generado por tu aplicación.</p>
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="text" id="2fa_app_code" class="component-input-field" placeholder=" " maxlength="6">
                                    <label for="2fa_app_code" class="component-input-label">Código de la aplicación</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end" style="width: 100%; justify-content: flex-end; display: flex; gap: 8px; margin-top: 16px;">
                        <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/security"><?php echo __('btn_cancel'); ?></button>
                        <button class="component-button component-button--h36 component-button--dark" data-action="submitActivate2FA">Activar</button>
                    </div>
                </div>
            </div>

            <div class="component-card--grouped disabled" id="2fa-recovery-container">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        <div class="component-card__text">
                            <h2 class="component-card__title" style="color: #16a34a; display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-rounded">check_circle</span> 2FA Activado Correctamente
                            </h2>
                            <p class="component-card__description" style="margin-top: 12px;">Guarda estos 10 códigos de recuperación en un lugar seguro. Podrás usarlos para iniciar sesión si pierdes acceso a tu dispositivo.</p>
                            <div id="2fa-recovery-codes-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px;">
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--stretch" style="margin-top: 16px;">
                        <button class="component-button component-button--h36" data-action="copyRecoveryCodes">Copiar códigos</button>
                        <button class="component-button component-button--h36 component-button--dark" data-action="finish2FA">Terminar</button>
                    </div>
                </div>
            </div>

        <?php else: ?>
            <div class="component-card--grouped active" id="2fa-deactivate-container">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded" style="color: #16a34a;">verified_user</span>
                        </div>

                        <div class="component-card__text">
                            <h2 class="component-card__title">Desactivar autenticación de dos factores</h2>
                            <p class="component-card__description">Al desactivar 2FA, tu cuenta será menos segura. Ingresa tu contraseña actual para confirmar.</p>
                            
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="password" id="2fa_disable_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                    <label for="2fa_disable_password" class="component-input-label">Contraseña actual</label>
                                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end" style="width: 100%; justify-content: flex-end; display: flex; gap: 8px; margin-top: 16px;">
                        <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/security">Volver</button>
                        <button class="component-button component-button--h36 component-button--danger" data-action="submitDeactivate2FA">Desactivar 2FA</button>
                    </div>
                </div>
            </div>
        <?php endif; ?>

    </div>
</div>