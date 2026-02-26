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
                                    <div id="2fa-qr-container">
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
                            <div class="component-card__actions component-card__actions--end">
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
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">shield</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">2FA Activado Correctamente</h2>
                            <p class="component-card__description">Guarda estos 10 códigos de recuperación en un lugar seguro. Podrás usarlos para iniciar sesión si pierdes acceso a tu dispositivo.</p>
                            <div id="2fa-recovery-codes-list">
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button class="component-button component-button--h36" data-action="copyRecoveryCodes">Copiar códigos</button>
                        <button class="component-button component-button--h36 component-button--dark" data-action="finish2FA">Terminar</button>
                    </div>
                </div>
            </div>

        <?php else: ?>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">key</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">Códigos de recuperación</h2>
                            <p class="component-card__description">Genera 10 nuevos códigos de recuperación. Los códigos anteriores dejarán de funcionar.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/2fa/recovery-codes">Generar códigos</button>
                    </div>
                </div>
                
                <hr class="component-divider">

                <div class="component-group-item component-group-item--wrap">
                    <div class="component-card__content">
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">verified_user</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">Desactivar 2FA</h2>
                            <p class="component-card__description">Al desactivar esta función, tu cuenta será menos segura.</p>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button type="button" class="component-button component-button--h36 component-button--danger" data-nav="/ProjectRosaura/settings/2fa/deactivate">Desactivar</button>
                    </div>
                </div>
            </div>

        <?php endif; ?>

    </div>
</div>