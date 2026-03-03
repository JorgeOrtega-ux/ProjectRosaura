<?php
// includes/core/bootstrap.php

session_start();

// Definimos la constante de la raíz del proyecto (2 niveles arriba: incluye/core -> incluye -> raíz)
define('ROOT_PATH', dirname(__DIR__, 2));

// Cabeceras de seguridad
header("X-Frame-Options: SAMEORIGIN");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://api.qrserver.com; connect-src 'self' https://unpkg.com; frame-ancestors 'none';");

require_once ROOT_PATH . '/vendor/autoload.php';

// =========================================================================
// --- 0. INTERCEPCIÓN DE RESTAURACIÓN DE EMERGENCIA (RESTORE LOCK) ---
// =========================================================================

// Cargamos variables de entorno mínimas para conectarnos a Redis temprano
$envPath = ROOT_PATH . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') !== 0 && strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                $_ENV[$name] = $value;
            }
        }
    }
}

// DEFINIMOS APP_URL globalmente. Quitamos la barra final para consistencia
define('APP_URL', rtrim($_ENV['APP_URL'] ?? '', '/'));

function render_restoring_view() {
    http_response_code(503); // Service Unavailable
    
    // Si es petición SPA/API
    if (isset($_SERVER['HTTP_X_SPA_REQUEST']) || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)) {
        echo json_encode(['success' => false, 'status' => 'restoring', 'message' => 'El sistema está restaurando una copia de seguridad profunda. Por favor, espera unos momentos.']);
        exit;
    }

    echo '<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restaurando Sistema - Project Rosaura</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
        <link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/root.css">
        <link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/styles.css">
        <link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/components/components.css">
    </head>
    <body>
        <div class="view-content">
            <div class="component-layout-centered">
                <div class="component-wrapper">
                    <div class="component-header-card">
                        <div class="component-spinner component-spinner--centered"></div>
                        <br>
                        <h1 class="component-page-title">Restaurando Sistema</h1>
                        <p class="component-page-description">Estamos aplicando una copia de seguridad y reconstruyendo la base de datos. Para evitar corrupción de datos, el acceso al sistema se ha bloqueado temporalmente. Vuelve a intentar en unos instantes.</p>
                        <br>
                        <button class="component-button component-button--dark component-button--h45" onclick="window.location.reload();">Actualizar página</button>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>';
    exit;
}

try {
    $redisHost = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
    $redisPort = (int)($_ENV['REDIS_PORT'] ?? 6379);
    $redisParams = ['scheme' => 'tcp', 'host' => $redisHost, 'port' => $redisPort];
    if (!empty($_ENV['REDIS_PASS'])) {
        $redisParams['password'] = $_ENV['REDIS_PASS'];
    }
    $redis = new \Predis\Client($redisParams);
    
    // Si la llave existe, detenemos TODO aquí mismo. Nada más cargará.
    if ($redis->exists('system_status:restoring')) {
        render_restoring_view();
    }
} catch (\Exception $e) {
    // Si Redis está apagado, ignoramos el error para no botar la plataforma por completo
}

// =========================================================================
// --- 1. MANEJO GLOBAL DE ERRORES Y EXCEPCIONES (Ocultar PHP) ---
// =========================================================================

ini_set('display_errors', 0);
error_reporting(E_ALL);

function render_fatal_error_view() {
    http_response_code(500);
    
    if (isset($_SERVER['HTTP_X_SPA_REQUEST']) || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)) {
        echo json_encode(['success' => false, 'message' => 'Ocurrió un error interno en el servidor.']);
        exit;
    }

    echo '<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error 500 - Project Rosaura</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" />
        <link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/root.css">
        <link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/styles.css">
        <link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/components/components.css">
    </head>
    <body>
        <div class="view-content">
            <div class="component-message-layout">
                <div class="component-message-box">
                    <div class="component-message-icon-wrapper">
                        <span class="material-symbols-rounded component-message-icon">gpp_bad</span>
                    </div>
                    <h1 class="component-message-title">Error Interno del Servidor</h1>
                    <p class="component-message-desc">Lo sentimos, no pudimos cargar esta sección. Ha ocurrido un problema técnico en el servidor y nuestro equipo ha sido notificado.</p>
                    <br>
                    <a href="' . APP_URL . '/" class="component-button component-button--dark component-button--h45">Volver a recargar</a>
                </div>
            </div>
        </div>
    </body>
    </html>';
    exit;
}

set_exception_handler(function (\Throwable $e) {
    \App\Core\System\Logger::security("Fatal Exception: " . $e->getMessage() . " en " . $e->getFile() . " línea " . $e->getLine(), 'critical');
    render_fatal_error_view();
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        \App\Core\System\Logger::security("Fatal Error: " . $error['message'] . " en " . $error['file'] . " línea " . $error['line'], 'critical');
        render_fatal_error_view();
    }
});

// =========================================================================

use App\Core\Helpers\Utils; 
use App\Core\System\Translator; 
use App\Core\Container;
use App\Api\Services\AuthServices;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;

// 1. Instanciar el Contenedor
$container = new Container();

// 2. Cargar Configuración del Servidor y exponerla globalmente
$configRepo = $container->get(ServerConfigRepositoryInterface::class);
$serverConfig = $configRepo->getConfig();

// 3. Obtener servicios
$authService = $container->get(AuthServices::class);
$prefsManager = $container->get(UserPrefsManagerInterface::class);
$userRepo = $container->get(UserRepositoryInterface::class);

// Manejo de Seguridad de Dispositivos, AutoLogin e Hidratación en Tiempo Real
if (isset($_SESSION['user_id'])) {
    if (!$authService->isCurrentDeviceValid()) {
        $authService->logout();
        header("Location: " . APP_URL . "/login");
        exit;
    } else {
        // --- HIDRATACIÓN EN TIEMPO REAL ---
        $liveUser = $userRepo->findById($_SESSION['user_id']);
        
        if (!$liveUser || $liveUser['user_status'] === 'deleted') {
            $authService->logout();
            header("Location: " . APP_URL . "/account-deleted");
            exit;
        }
        
        if (isset($liveUser['is_suspended']) && $liveUser['is_suspended'] == 1) {
            if ($liveUser['suspension_type'] === 'temporary' && $liveUser['suspension_end_date'] && strtotime($liveUser['suspension_end_date']) <= time()) {
                $userRepo->liftSuspension($liveUser['id']);
            } else {
                $authService->logout();
                header("Location: " . APP_URL . "/account-suspended");
                exit;
            }
        }
        
        $_SESSION['user_role'] = $liveUser['role'];
    }
} elseif (isset($_COOKIE['remember_token'])) {
    $authService->autoLogin(); 
}

$csrfToken = Utils::generateCSRFToken();

$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';

if ($isLoggedIn && !isset($_SESSION['user_prefs'])) {
    $_SESSION['user_prefs'] = $prefsManager->ensureDefaultPreferences($_SESSION['user_id']);
}

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
    function __($key, $params = []) { return Translator::get($key, $params); } 
}
?>