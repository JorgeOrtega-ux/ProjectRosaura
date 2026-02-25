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
            
            <div id="2fa-setup-container" class="component-setup-container active">
                
                <div class="component-card--grouped component-accordion active">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">qr_code_scanner</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">1. Configura tu aplicación</h2>
                                <p class="component-card__description">Vincula tu cuenta con tu aplicación de autenticación preferida.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            
                            <div class="component-2fa-setup">
                                <div class="component-2fa-qr-col">
                                    <div id="2fa-qr-container" style="width: 150px; height: 150px; display: flex; align-items: center; justify-content: center;">
                                        <div class="component-spinner"></div>
                                    </div>
                                </div>
                                
                                <div class="component-2fa-secret-col">
                                    <h3>¿No puedes escanear?</h3>
                                    <p>Ingresa esta clave en tu aplicación:</p>
                                    <div id="2fa-secret-text" class="component-2fa-secret-box">CARGANDO...</div>
                                </div>
                                
                                <div class="component-2fa-instructions-col">
                                    <h3>Pasos a seguir:</h3>
                                    <ol>
                                        <li>Descarga <b>Google Authenticator</b> o <b>Authy</b>.</li>
                                        <li>Escanea el código QR a la izquierda o usa la clave.</li>
                                        <li>Ingresa el código en el paso 2 de abajo.</li>
                                    </ol>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="component-card--grouped component-accordion">
                    <div class="component-group-item component-group-item--wrap component-accordion-header" data-action="toggleAccordion">
                        <div class="component-card__content">
                            <div class="component-card__icon-container component-card__icon-container--bordered">
                                <span class="material-symbols-rounded">verified_user</span>
                            </div>
                            <div class="component-card__text">
                                <h2 class="component-card__title">2. Verifica el código</h2>
                                <p class="component-card__description">Ingresa el código de 6 dígitos generado por tu aplicación.</p>
                            </div>
                        </div>
                        <div class="component-card__actions component-card__actions--end">
                            <span class="material-symbols-rounded component-accordion-icon">expand_more</span>
                        </div>
                    </div>
                    <div class="component-accordion-body">
                        <div class="component-accordion-content">
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="text" id="2fa_app_code" class="component-input-field" placeholder=" " maxlength="6">
                                    <label for="2fa_app_code" class="component-input-label">Código de la aplicación</label>
                                </div>
                            </div>
                            <div class="component-card__actions component-card__actions--end" style="width: 100%; justify-content: flex-end; display: flex; gap: 8px; margin-top: 16px;">
                                <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/security"><?php echo __('btn_cancel'); ?></button>
                                <button class="component-button component-button--h36 component-button--dark" data-action="submitActivate2FA">Activar</button>
                            </div>
                        </div>
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

            <div class="component-card--grouped active" id="2fa-regenerate-container" style="margin-bottom: 16px;">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded" style="color: #206BD3;">key</span>
                        </div>

                        <div class="component-card__text">
                            <h2 class="component-card__title">Códigos de recuperación</h2>
                            <p class="component-card__description">Genera 10 nuevos códigos de recuperación. Los códigos anteriores dejarán de funcionar. Ingresa tu contraseña actual para confirmar la operación.</p>
                            
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="password" id="2fa_regenerate_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                    <label for="2fa_regenerate_password" class="component-input-label">Contraseña actual</label>
                                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                </div>
                            </div>

                            <div id="2fa-new-recovery-codes-wrapper" style="display: none; margin-top: 16px;">
                                <h2 class="component-card__title" style="color: #16a34a; display: flex; align-items: center; gap: 8px;">
                                    <span class="material-symbols-rounded">check_circle</span> Nuevos códigos generados
                                </h2>
                                <p class="component-card__description" style="margin-top: 12px;">Guarda estos 10 nuevos códigos en un lugar seguro.</p>
                                <div id="2fa-new-recovery-codes-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px;">
                                </div>
                                <div style="margin-top: 12px;">
                                    <button class="component-button component-button--h36" data-action="copyNewRecoveryCodes">Copiar códigos</button>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end" style="width: 100%; justify-content: flex-end; display: flex; gap: 8px; margin-top: 16px;">
                        <button class="component-button component-button--h36 component-button--dark" data-action="submitRegenerateRecoveryCodes">Generar nuevos códigos</button>
                    </div>
                </div>
            </div>

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