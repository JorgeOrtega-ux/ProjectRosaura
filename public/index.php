<?php
// public/index.php
session_start();

// ========================================================================================
// --- CABECERAS DE SEGURIDAD HTTP ---
// ========================================================================================
header("X-Frame-Options: SAMEORIGIN");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';");

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Loader;
use App\Core\Router;
use App\Core\Utils; 

$csrfToken = Utils::generateCSRFToken();
$routes = require __DIR__ . '/../includes/config/routes.php';

$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

// Detectar variables de estado clave
$isLoggedIn = isset($_SESSION['user_id']);
$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isAuthRoute = (strpos($currentView, 'auth/') === 0);


// ========================================================================================
// --- PROTECCIÓN DE RUTAS Y REDIRECCIONES (ANTES DE ENVIAR CUALQUIER OUTPUT HTML) ---
// ========================================================================================
$protectedSettings = [
    'settings/your-profile.php',
    'settings/security.php',
    'settings/accessibility.php'
];

$redirectUrl = null;

// 1. Entrada a /settings base
if ($currentView === 'settings/index.php') {
    $currentView = $isLoggedIn ? 'settings/your-profile.php' : 'settings/guest.php';
    $redirectUrl = $isLoggedIn ? '/ProjectRosaura/settings/your-profile' : '/ProjectRosaura/settings/guest';
}
// 2. Proteger secciones si NO está logueado
elseif (in_array($currentView, $protectedSettings) && !$isLoggedIn) {
    $currentView = 'settings/guest.php';
    $redirectUrl = '/ProjectRosaura/settings/guest';
}
// 3. Proteger la vista de invitado si SÍ está logueado
elseif ($currentView === 'settings/guest.php' && $isLoggedIn) {
    $currentView = 'settings/your-profile.php';
    $redirectUrl = '/ProjectRosaura/settings/your-profile';
}

// Si la validación determinó que debemos cambiar de ruta...
if ($redirectUrl) {
    if ($isSpaRequest) {
        // Redirección interna: Le decimos al JS que actualice la URL en el navegador,
        // pero NO detenemos la ejecución. El loader seguirá fluyendo hacia abajo.
        header("X-SPA-Update-URL: " . $redirectUrl);
    } else {
        // Redirección dura si el usuario recargó la página con F5
        header("Location: " . $redirectUrl);
        exit;
    }
}
// ========================================================================================


// Interceptar petición SPA (Renderiza solo la vista)
if ($isSpaRequest) {
    $loader->load($currentView);
    exit; 
}
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="/ProjectRosaura/">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
    
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
    <link rel="stylesheet" type="text/css" href="assets/css/styles.css">
    <link rel="stylesheet" type="text/css" href="assets/css/components/components.css">
    <title>Project Rosaura</title>
</head>

<body>
    <div class="page-wrapper">
        <div class="main-content">
            <div class="general-content">
                
                <div class="general-content-top <?php echo $isAuthRoute ? 'disabled' : ''; ?>">
                    <?php include __DIR__ . '/../includes/layouts/header.php'; ?>
                </div>

                <div class="general-content-bottom">
                    
                    <?php include __DIR__ . '/../includes/modules/moduleSurface.php'; ?>

                    <div class="general-content-scrolleable" id="app-router-outlet">
                        <?php $loader->load($currentView); ?>
                    </div>

                </div>

            </div>
        </div>
    </div>

    <div id="toast-container" class="toast-container"></div>

    <script type="module" src="assets/js/app-init.js"></script>
</body>

</html>