<div class="component-layout-centered">
    <div class="component-form-box">
        
        <div class="component-form-header">
            <h1 class="component-form-title">Crear cuenta</h1>
            <p class="component-form-desc">Regístrate para comenzar a explorar colecciones.</p>
        </div>

        <div class="component-form-body">
            
            <div class="component-input-group">
                <input type="email" id="email" name="email" class="component-input-field" placeholder=" ">
                <label for="email" class="component-input-label">Correo electrónico</label>
            </div>

            <div class="component-input-group">
                <input type="text" id="username" name="username" class="component-input-field" placeholder=" ">
                <label for="username" class="component-input-label">Nombre de usuario</label>
            </div>

            <div class="component-input-group">
                <input type="password" id="password" name="password" class="component-input-field component-input-field--with-icon" placeholder=" ">
                <label for="password" class="component-input-label">Contraseña</label>
                <span class="material-symbols-rounded component-input-toggle" data-action="togglePassword">visibility_off</span>
            </div>

            <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitRegister">
                Continuar
            </button>

            <div class="component-link-container component-link-container--center">
                <span class="component-link-text">¿Ya tienes una cuenta?</span>
                <span class="component-link" data-nav="/ProjectRosaura/login">Iniciar sesión</span>
            </div>

        </div>

    </div>
</div>