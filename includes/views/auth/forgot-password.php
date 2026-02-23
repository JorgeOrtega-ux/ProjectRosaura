<div class="component-layout-centered">
    <div class="component-form-box">
        
        <div class="component-form-header">
            <h1 class="component-form-title">Recuperar cuenta</h1>
            <p class="component-form-desc">Ingresa tu correo para recibir un enlace de recuperación.</p>
        </div>

        <div class="component-form-body">
            
            <div class="component-input-group">
                <input type="email" id="forgot_email" name="email" class="component-input-field" placeholder=" ">
                <label for="forgot_email" class="component-input-label">Correo electrónico</label>
            </div>

            <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitForgotPassword">
                Continuar
            </button>
            
            <div class="component-alert-error" id="auth-error-message"></div>
            <div class="component-alert-success" id="auth-success-message"></div>

            <div class="component-link-container component-link-container--center">
                <span class="component-link" data-nav="/ProjectRosaura/login">Volver al inicio de sesión</span>
            </div>

        </div>

    </div>
</div>