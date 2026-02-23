<?php
// public/index.php
session_start(); // AGREGADO PARA EL MANEJO DE SESIONES

// ========================================================================================
// --- CABECERAS DE SEGURIDAD HTTP ---
// ========================================================================================

// 1. Prevenir Clickjacking bloqueando iframes externos o limitándolos al mismo origen
header("X-Frame-Options: SAMEORIGIN");

// 2. Prevenir MIME-Sniffing obligando al navegador a respetar el Content-Type declarado
header("X-Content-Type-Options: nosniff");

// 3. Content Security Policy (CSP) contra XSS:
// - default-src 'self': Permite contenido del mismo dominio.
// - script-src: 'self' y 'unsafe-inline' (para los inlines de config en header.php).
// - style-src: 'self', 'unsafe-inline' y fuentes de Google.
// - font-src: 'self' y las fuentes renderizadas de Google.
// - img-src: 'self' y base64 (data:)
// - connect-src: 'self' (Esencial para las peticiones fetch de la SPA hacia la API local).
// - frame-ancestors 'none': Directiva moderna para Clickjacking.
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';");

// ========================================================================================

// Cargar autoloader de Composer
require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Loader;
use App\Core\Router;
use App\Core\Utils; 

// Generar o recuperar el token CSRF para esta sesión
$csrfToken = Utils::generateCSRFToken();

// Conservamos este require ya que devuelve un arreglo
$routes = require __DIR__ . '/../includes/config/routes.php';

$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

// Detectar si la vista inicial es de autenticación para el renderizado del lado del servidor
$isAuthRoute = (strpos($currentView, 'auth/') === 0);

// Interceptar petición SPA
$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
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

    <script type="module" src="assets/js/app-init.js"></script>
</body>

</html>