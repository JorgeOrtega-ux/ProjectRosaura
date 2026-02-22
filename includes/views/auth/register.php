<?php
// Resolvemos la ruta actual para saber qué etapa mostrar
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$basePath = '/ProjectRosaura';
$relativePath = substr($requestUri, strlen($basePath));
if ($relativePath === '' || $relativePath === false) {
    $relativePath = '/';
}
if (strlen($relativePath) > 1 && substr($relativePath, -1) === '/') {
    $relativePath = rtrim($relativePath, '/');
}

$errorMsg = null;

// Validación de protección de acceso directo
if ($relativePath === '/register/aditional-data') {
    if (empty($_SESSION['reg_email']) || empty($_SESSION['reg_password'])) {
        $errorMsg = "No hay datos previos. Por favor inicia el registro desde el principio.";
    }
} elseif ($relativePath === '/register/verification-account') {
    if (empty($_SESSION['reg_email']) || empty($_SESSION['reg_username'])) {
        $errorMsg = "No hay datos previos. Por favor inicia el registro desde el principio.";
    }
}
?>

<div class="component-layout-centered">
    <div class="component-form-box">
        
        <?php if ($errorMsg): ?>
            <div class="component-form-header">
                <h1 class="component-form-title" style="color: #d32f2f;">Acceso Denegado</h1>
                <p class="component-form-desc"><?php echo htmlspecialchars($errorMsg); ?></p>
            </div>
            <div class="component-form-body">
                <button class="component-button component-button--dark component-button--h45 component-button--full" data-nav="/ProjectRosaura/register">
                    Volver al inicio
                </button>
            </div>
        <?php else: ?>

            <?php if ($relativePath === '/register'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title">Crear cuenta</h1>
                    <p class="component-form-desc">Paso 1: Ingresa tu correo y contraseña.</p>
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

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitRegisterStep1">
                        Continuar
                    </button>

                    <div class="component-link-container component-link-container--center">
                        <span class="component-link-text">¿Ya tienes una cuenta?</span>
                        <span class="component-link" data-nav="/ProjectRosaura/login">Iniciar sesión</span>
                    </div>
                </div>

            <?php elseif ($relativePath === '/register/aditional-data'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title">Datos adicionales</h1>
                    <p class="component-form-desc">Paso 2: Elige cómo te llamarán los demás.</p>
                </div>

                <div class="component-form-body">
                    <div class="component-input-group">
                        <input type="text" id="username" name="username" class="component-input-field" placeholder=" ">
                        <label for="username" class="component-input-label">Nombre de usuario</label>
                    </div>

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitRegisterStep2">
                        Continuar
                    </button>

                    <div class="component-link-container component-link-container--center">
                        <span class="component-link" data-nav="/ProjectRosaura/register">Volver atrás</span>
                    </div>
                </div>

            <?php elseif ($relativePath === '/register/verification-account'): ?>
                <div class="component-form-header">
                    <h1 class="component-form-title">Verificar cuenta</h1>
                    <p class="component-form-desc">Paso 3: Ingresa el código de 12 dígitos que te enviamos.</p>
                </div>

                <div class="component-form-body">
                    <div class="component-input-group">
                        <input type="text" id="verification_code" name="verification_code" class="component-input-field" placeholder=" " maxlength="12">
                        <label for="verification_code" class="component-input-label">Código de verificación</label>
                    </div>

                    <button class="component-button component-button--dark component-button--h45 component-button--full" data-action="submitRegisterVerify">
                        Crear cuenta
                    </button>
                    
                    <div class="component-link-container component-link-container--center">
                        <span class="component-link" data-nav="/ProjectRosaura/register/aditional-data">Volver atrás</span>
                    </div>
                </div>
            <?php endif; ?>

        <?php endif; ?>
    </div>
</div>