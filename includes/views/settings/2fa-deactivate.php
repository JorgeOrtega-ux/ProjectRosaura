<?php
// includes/views/settings/2fa-deactivate.php
if (session_status() === PHP_SESSION_NONE) session_start();
?>
<div class="view-content">
    <div class="component-wrapper">
        
        <div class="component-header-card">
            <h1 class="component-page-title"><?php echo __('2fa_deactivate_title'); ?></h1>
            <p class="component-page-description"><?php echo __('2fa_deactivate_desc'); ?></p>
        </div>

        <div class="component-card--grouped">
            
            <div class="component-group-item component-group-item--stacked">
                <div class="component-card__content component-card__content--full component-card__content--start">
                    <div class="component-card__icon-container component-card__icon-container--bordered">
                        <span class="material-symbols-rounded">warning</span>
                    </div>
                    <div class="component-card__text">
                        <h2 class="component-card__title">Desactivar 2FA</h2>
                        <p class="component-card__description">Al desactivar esta función, tu cuenta solo estará protegida por tu contraseña. Si alguien la descubre, podrá acceder sin restricciones.</p>
                    </div>
                </div>
            </div>

            <hr class="component-divider">

            <div class="component-group-item component-group-item--wrap">
                <div class="component-card__content">
                    <div class="component-card__text">
                        <h2 class="component-card__title">Confirmar riesgos</h2>
                        <p class="component-card__description">Entiendo los riesgos y deseo desactivar el 2FA de mi cuenta.</p>
                    </div>
                </div>
                <div class="component-card__actions component-card__actions--end">
                    <label class="component-toggle-switch">
                        <input type="checkbox" id="chk_confirm_deactivate_2fa">
                        <span class="component-toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div id="deactivate_2fa_password_area" class="disabled">
                <hr class="component-divider">
                <div class="component-group-item component-group-item--stacked">
                    <div class="component-card__content component-card__content--full component-card__content--start">
                        <div class="component-card__text">
                            <h2 class="component-card__title">Verificar identidad</h2>
                            <p class="component-card__description">Para finalizar, ingresa tu contraseña actual:</p>
                            
                            <div class="component-card__form-area">
                                <div class="component-input-group">
                                    <input type="password" id="2fa_disable_password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                                    <label for="2fa_disable_password" class="component-input-label">Contraseña actual</label>
                                    <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="component-card__actions component-card__actions--end">
                        <button class="component-button component-button--h36" data-nav="/ProjectRosaura/settings/2fa">Cancelar</button>
                        <button class="component-button component-button--h36 component-button--danger" data-action="submitDeactivate2FA">Desactivar permanentemente</button>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>