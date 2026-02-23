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
use App\Config\Database; // IMPORTANTE: Se importó la conexión a BD

$csrfToken = Utils::generateCSRFToken();
$routes = require __DIR__ . '/../includes/config/routes.php';

$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

// Detectar variables de estado clave
$isLoggedIn = isset($_SESSION['user_id']);

// ========================================================================================
// --- FIX: AUTOSANAR SESIONES ANTIGUAS SIN PREFERENCIAS ---
// ========================================================================================
// Si tienes sesión activa, pero no tienes preferencias cargadas (sesión antigua):
if ($isLoggedIn && !isset($_SESSION['user_prefs'])) {
    $db = new Database();
    $pdo = $db->getConnection();
    
    $stmt = $pdo->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $prefs = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($prefs) {
        $_SESSION['user_prefs'] = $prefs;
    } else {
        // Si el usuario es tan viejo que ni siquiera tiene fila en la tabla
        $insPref = $pdo->prepare("INSERT INTO user_preferences (user_id, language, open_links_new_tab, theme, extended_alerts) VALUES (?, 'es-419', 1, 'system', 0)");
        if ($insPref->execute([$_SESSION['user_id']])) {
            $stmt->execute([$_SESSION['user_id']]);
            $_SESSION['user_prefs'] = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    }
}

$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isAuthRoute = (strpos($currentView, 'auth/') === 0);

// ========================================================================================
// --- PROTECCIÓN DE RUTAS Y REDIRECCIONES ---
// ========================================================================================
$protectedSettings = [
    'settings/your-profile.php',
    'settings/security.php',
    'settings/accessibility.php'
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
    if ($isSpaRequest) {
        header("X-SPA-Update-URL: " . $redirectUrl);
    } else {
        header("Location: " . $redirectUrl);
        exit;
    }
}

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
    
    <script>
        // Si la sesión está sanada, esto ya no devolverá 'null'
        window.AppUserPrefs = <?php echo ($isLoggedIn && isset($_SESSION['user_prefs'])) ? json_encode($_SESSION['user_prefs']) : 'null'; ?>;
        
        (function() {
            var theme = 'system';
            if (window.AppUserPrefs && window.AppUserPrefs.theme) {
                theme = window.AppUserPrefs.theme;
            } else {
                var guestTheme = localStorage.getItem('pr_theme');
                if (guestTheme) theme = guestTheme;
            }
            
            var isDark = false;
            if (theme === 'system') {
                isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            } else if (theme === 'dark') {
                isDark = true;
            }
            
            if (isDark) {
                document.documentElement.classList.add('dark-theme');
            } else {
                document.documentElement.classList.add('light-theme');
            }
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