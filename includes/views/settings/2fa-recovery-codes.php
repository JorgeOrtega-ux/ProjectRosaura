<?php
// includes/views/settings/2fa-recovery-codes.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('2fa_recovery_title'); ?></h1>
            <p class="component-page-description"><?php echo __('2fa_recovery_desc'); ?></p>
        </div>

        <div class="component-card--grouped active" id="step-1-generate-codes">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">lock</span>
                    </div>

                    <div class="component-card__text">
                        <h2 class="component-card__title">Verificar identidad</h2>
                        <p class="component-card__description">Por razones de seguridad, ingresa tu contraseña actual para continuar y generar los nuevos códigos.</p>
                        
                        <div class="component-card__form-area">
                            <div class="component-input-group">
                                <input type="password" id="2fa_regenerate_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                <label for="2fa_regenerate_password" class="component-input-label">Contraseña actual</label>
                                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/2fa">Cancelar</button>
                    <button class="component-button component-button--h36 component-button--dark" data-action="submitRegenerateRecoveryCodes">Confirmar</button>
                </div>
            </div>
        </div>

        <div class="component-card--grouped disabled" id="2fa-new-recovery-codes-wrapper">
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">shield</span>
                    </div>

                    <div class="component-card__text">
                        <h2 class="component-card__title">Nuevos códigos generados</h2>
                        <p class="component-card__description">Guarda estos 10 códigos de recuperación en un lugar seguro. Podrás usarlos para iniciar sesión si pierdes acceso a tu dispositivo.</p>
                        
                        <div id="2fa-new-recovery-codes-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                            </div>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end" style="width: 100%;">
                    <button class="component-button component-button--h36" data-action="copyNewRecoveryCodes">Copiar códigos</button>
                    <button class="component-button component-button--h36 component-button--dark" data-nav="/ProjectRosaura/settings/2fa">Terminar</button>
                </div>
            </div>
        </div>

    </div>
</div>