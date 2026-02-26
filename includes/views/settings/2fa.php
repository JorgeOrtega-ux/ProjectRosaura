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
                        <div class="component-card__icon-container component-card__icon-container--bordered">
                            <span class="material-symbols-rounded">shield</span>
                        </div>
                        <div class="component-card__text">
                            <h2 class="component-card__title">2FA Activado Correctamente</h2>
                            <p class="component-card__description">Guarda estos 10 códigos de recuperación en un lugar seguro. Podrás usarlos para iniciar sesión si pierdes acceso a tu dispositivo.</p>
                            <div id="2fa-recovery-codes-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end" style="width: 100%;">
                        <button class="component-button component-button--h36" data-action="copyRecoveryCodes">Copiar códigos</button>
                        <button class="component-button component-button--h36 component-button--dark" data-action="finish2FA">Terminar</button>
                    </div>
                </div>
            </div>

        <?php else: ?>

            <div class="component-card--grouped" style="margin-bottom: 16px;">
                <div class="component-group-item component-group-item--stateful">
                    
                    <div class="active component-state-box" data-state="regenerate-view">
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
                            <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="regenerate">Generar códigos</button>
                        </div>
                    </div>

                    <div class="disabled component-state-box" data-state="regenerate-edit">
                        <div class="component-card__content" style="width: 100%;">
                            <div class="component-card__text" style="width: 100%;">
                                <h2 class="component-card__title">Generar nuevos códigos</h2>
                                <p class="component-card__description">Ingresa tu contraseña actual para confirmar la operación.</p>
                                
                                <div class="component-edit-row" id="2fa-regenerate-form-row">
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="password" id="2fa_regenerate_password" class="component-input-field component-input-field--simple" style="padding-right: 40px !important;" placeholder="Contraseña actual">
                                        <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="regenerate">Cancelar</button>
                                        <button type="button" class="component-button component-button--h34 component-button--dark" data-action="submitRegenerateRecoveryCodes">Confirmar</button>
                                    </div>
                                </div>

                                <div id="2fa-new-recovery-codes-wrapper" style="display: none; margin-top: 16px; border-top: 1px solid #00000020; padding-top: 16px;">
                                    <div class="component-card__content component-card__content--start">
                                        <div class="component-card__icon-container component-card__icon-container--bordered">
                                            <span class="material-symbols-rounded">shield</span>
                                        </div>
                                        <div class="component-card__text">
                                            <h2 class="component-card__title">Nuevos códigos generados</h2>
                                            <p class="component-card__description">Guarda estos 10 códigos de recuperación en un lugar seguro. Podrás usarlos para iniciar sesión si pierdes acceso a tu dispositivo.</p>
                                        </div>
                                    </div>
                                    <div id="2fa-new-recovery-codes-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                                    </div>
                                    <div class="component-card__actions component-card__actions--end" style="width: 100%; margin-top: 16px;">
                                        <button class="component-button component-button--h36" data-action="copyNewRecoveryCodes">Copiar códigos</button>
                                        <button class="component-button component-button--h36 component-button--dark" data-action="toggleEditState" data-target="regenerate">Terminar</button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div class="component-card--grouped">
                <div class="component-group-item component-group-item--stateful">
                    
                    <div class="active component-state-box" data-state="deactivate-view">
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
                            <button type="button" class="component-button component-button--h34 component-button--danger" data-action="toggleEditState" data-target="deactivate">Desactivar</button>
                        </div>
                    </div>

                    <div class="disabled component-state-box" data-state="deactivate-edit">
                        <div class="component-card__content" style="width: 100%;">
                            <div class="component-card__text" style="width: 100%;">
                                <h2 class="component-card__title">Desactivar autenticación de dos factores</h2>
                                <p class="component-card__description">Ingresa tu contraseña actual para confirmar la desactivación.</p>
                                
                                <div class="component-edit-row">
                                    <div class="component-input-group component-input-group--h34">
                                        <input type="password" id="2fa_disable_password" class="component-input-field component-input-field--simple" style="padding-right: 40px !important;" placeholder="Contraseña actual">
                                        <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                    </div>
                                    <div class="component-card__actions component-card__actions--stretch">
                                        <button type="button" class="component-button component-button--h34" data-action="toggleEditState" data-target="deactivate">Cancelar</button>
                                        <button type="button" class="component-button component-button--h34 component-button--danger" data-action="submitDeactivate2FA">Confirmar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        <?php endif; ?>

    </div>
</div>