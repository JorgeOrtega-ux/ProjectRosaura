<div class="component-layout-centered">
    <div class="component-form-box">
        
        <div class="component-form-header">
            <h1 class="component-form-title">Iniciar sesión</h1>
            <p class="component-form-desc">Bienvenido de nuevo, ingresa tus credenciales.</p>
        </div>

        <div class="component-form-body">
            
            <div class="component-input-group">
                <input type="email" id="email" name="email" class="component-input-field" placeholder=" ">
                <label for="email" class="component-input-label">Correo electrónico</label>
            </div>

            <div class="component-input-group">
                <input type="password" id="password" name="password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                <label for="password" class="component-input-label">Contraseña</label>
                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
            </div>

            <div class="component-link-container component-link-container--right">
                <span class="component-link" data-nav="/ProjectRosaura/forgot-password">¿Olvidaste la contraseña?</span>
            </div>

            <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitLogin">
                Continuar
            </button>
            
            <div class="component-alert-error" id="auth-error-message"></div>

            <div class="component-link-container component-link-container--center">
                <span class="component-link-text">¿No tienes una cuenta?</span>
                <span class="component-link" data-nav="/ProjectRosaura/register">Crear cuenta</span>
            </div>

        </div>

    </div>
</div>