<?php
// public/index.php
session_start();

header("X-Frame-Options: SAMEORIGIN");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://api.qrserver.com; connect-src 'self'; frame-ancestors 'none';");

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Loader;
use App\Core\Router;
use App\Core\Utils; 
use App\Core\Translator; 
use App\Core\Container;
use App\Api\Services\AuthServices;
use App\Core\Interfaces\UserPrefsManagerInterface;

// 1. Instanciar el Contenedor
$container = new Container();

// 2. Obtener servicios del contenedor usando la nueva sintaxis PSR-11
$authService = $container->get(AuthServices::class);
$prefsManager = $container->get(UserPrefsManagerInterface::class);

// Manejo de Seguridad de Dispositivos y AutoLogin
// Ahora verificamos mediante el SessionManager que AuthServices utiliza internamente
if (isset($_SESSION['user_id'])) {
    if (!$authService->isCurrentDeviceValid()) {
        $authService->logout();
        header("Location: /ProjectRosaura/login");
        exit;
    }
} elseif (isset($_COOKIE['remember_token'])) {
    $authService->autoLogin(); 
}

// Generar Token CSRF para la sesión
$csrfToken = Utils::generateCSRFToken();

// Configuración de Rutas y Navegación
$routes = require __DIR__ . '/../includes/config/routes.php';
$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

$isLoggedIn = isset($_SESSION['user_id']);

// Sincronizar preferencias si faltan en la sesión
if ($isLoggedIn && !isset($_SESSION['user_prefs'])) {
    $_SESSION['user_prefs'] = $prefsManager->ensureDefaultPreferences($_SESSION['user_id']);
}

// Inicialización de Idioma
$lang = 'es-419';
if ($isLoggedIn && !empty($_SESSION['user_prefs']['language'])) {
    $lang = $_SESSION['user_prefs']['language'];
} elseif (isset($_COOKIE['pr_language'])) {
    $lang = $_COOKIE['pr_language']; 
} else {
    $lang = Utils::getClosestLanguage($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
}

Translator::init($lang);
if (!function_exists('__')) { 
    function __($key) { return Translator::get($key); } 
}

// Lógica de Redirección SPA / Guest
$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isAuthRoute = (strpos($currentView, 'auth/') === 0);

$protectedSettings = [
    'settings/your-profile.php', 'settings/security.php', 'settings/accessibility.php',
    'settings/change-password.php', 'settings/2fa.php', 'settings/devices.php', 'settings/delete-account.php'
];

$redirectUrl = null;
if ($currentView === 'settings/index.php') {
    $currentView = $isLoggedIn ? 'settings/your-profile.php' : 'settings/guest.php';
    $redirectUrl = $isLoggedIn ? '/ProjectRosaura/settings/your-profile' : '/ProjectRosaura/settings/guest';
} elseif (in_array($currentView, $protectedSettings) && !$isLoggedIn) {
    $currentView = 'settings/guest.php';
    $redirectUrl = '/ProjectRosaura/settings/guest';
} elseif ($currentView === 'settings/guest.php' && $isLoggedIn) {
    $currentView = 'settings/your-profile.php';
    $redirectUrl = '/ProjectRosaura/settings/your-profile';
}

if ($redirectUrl) {
    if ($isSpaRequest) header("X-SPA-Update-URL: " . $redirectUrl);
    else { header("Location: " . $redirectUrl); exit; }
}

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
    
    <script>
        window.AppUserPrefs = <?php echo ($isLoggedIn && isset($_SESSION['user_prefs'])) ? json_encode($_SESSION['user_prefs']) : 'null'; ?>;
        window.AppTranslations = <?php echo json_encode(Translator::getAll()); ?>;
        function __(key) { return (window.AppTranslations && window.AppTranslations[key] !== undefined) ? window.AppTranslations[key] : key; }
        (function() {
            var theme = 'system';
            if (window.AppUserPrefs && window.AppUserPrefs.theme) theme = window.AppUserPrefs.theme;
            else { var guestTheme = localStorage.getItem('pr_theme'); if (guestTheme) theme = guestTheme; }
            var isDark = false;
            if (theme === 'system') isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            else if (theme === 'dark') isDark = true;
            if (isDark) document.documentElement.classList.add('dark-theme');
            else document.documentElement.classList.add('light-theme');
        })();
    </script>
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
    <div id="dialog-container"></div>
    <script type="module" src="assets/js/app-init.js"></script>
</body>
</html>