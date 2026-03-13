<?php
// includes/core/bootstrap.php

// Definimos la constante de la raíz del proyecto (2 niveles arriba: incluye/core -> incluye -> raíz)
define('ROOT_PATH', dirname(__DIR__, 2));

// Cabeceras de seguridad
header("X-Frame-Options: SAMEORIGIN");
header("X-Content-Type-Options: nosniff");
// ACTUALIZADO: Se añadió 'blob:' a img-src para permitir las previsualizaciones instantáneas en el Studio
// ACTUALIZADO: Se añadió 'blob:' a img-src y se creó la directiva media-src con 'blob:' para procesar videos en memoria
// ACTUALIZADO: Se añadió worker-src 'self' blob: para permitir que HLS.js cree Web Workers de procesamiento de video
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: blob: https://fonts.gstatic.com https://api.qrserver.com; img-src 'self' data: blob: https://api.qrserver.com; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self' https://unpkg.com ws: wss:; frame-ancestors 'self';");

require_once ROOT_PATH . '/vendor/autoload.php';

// =========================================================================
// --- 0. CARGA DE ENTORNO ---
// =========================================================================

// Usamos vlucas/phpdotenv como única fuente de la verdad para el entorno
$dotenv = \Dotenv\Dotenv::createImmutable(ROOT_PATH);
$dotenv->load();

// DEFINIMOS APP_URL globalmente. Quitamos la barra final para consistencia
define('APP_URL', rtrim($_ENV['APP_URL'] ?? '', '/'));

// Configuración centralizada de Redis
$redisClient = null;
try {
    $redisHost = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
    $redisPort = (int)($_ENV['REDIS_PORT'] ?? 6379);
    $redisParams = ['scheme' => 'tcp', 'host' => $redisHost, 'port' => $redisPort];
    if (!empty($_ENV['REDIS_PASS'])) {
        $redisParams['password'] = $_ENV['REDIS_PASS'];
    }
    
    $redisClient = new \Predis\Client($redisParams);
    $redisClient->ping(); 
    
    // =========================================================================
    // --- 1. INTERCEPCIÓN DE SESIONES CON REDIS ---
    // =========================================================================
    $sessionHandler = new \App\Core\System\RedisSessionHandler($redisClient);
    session_set_save_handler($sessionHandler, true);
    
} catch (\Exception $e) {
    error_log("No se pudo conectar a Redis para el manejo de sesiones. Error: " . $e->getMessage());
}

session_start();

// =========================================================================
// --- 2. INTERCEPCIÓN DE RESTAURACIÓN DE EMERGENCIA (RESTORE LOCK) ---
// =========================================================================

function render_restoring_view() {
    http_response_code(503); 
    
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
    if ($redisClient && $redisClient->exists('system_status:restoring')) {
        render_restoring_view();
    }
} catch (\Exception $e) {}

// =========================================================================
// --- 3. MANEJO GLOBAL DE ERRORES Y EXCEPCIONES (Ocultar PHP) ---
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

use App\Core\Helpers\Utils; 
use App\Core\System\Translator; 
use App\Core\Container;
use App\Api\Services\AuthServices;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;

$container = new Container();

$configRepo = $container->get(ServerConfigRepositoryInterface::class);
$serverConfig = $configRepo->getConfig();

$authService = $container->get(AuthServices::class);
$prefsManager = $container->get(UserPrefsManagerInterface::class);
$userRepo = $container->get(UserRepositoryInterface::class);

if (isset($_SESSION['user_id'])) {
    if (!$authService->isCurrentDeviceValid()) {
        $authService->logout();
        header("Location: " . APP_URL . "/login");
        exit;
    } else {
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