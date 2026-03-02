<?php
// includes/core/bootstrap.php

session_start();

// Cabeceras de seguridad
header("X-Frame-Options: SAMEORIGIN");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://api.qrserver.com; connect-src 'self' https://unpkg.com; frame-ancestors 'none';");

require_once __DIR__ . '/../../vendor/autoload.php';

// =========================================================================
// --- 0. INTERCEPCIÓN DE RESTAURACIÓN DE EMERGENCIA (RESTORE LOCK) ---
// =========================================================================

// Cargamos variables de entorno mínimas para conectarnos a Redis temprano
$envPath = __DIR__ . '/../../.env';
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
        <link rel="stylesheet" type="text/css" href="/ProjectRosaura/public/assets/css/styles.css">
        <link rel="stylesheet" type="text/css" href="/ProjectRosaura/public/assets/css/components/components.css">
    </head>
    <body>
        <div class="page-wrapper">
            <div class="main-content">
                <div class="general-content">
                    <div class="general-content-top">
                        <div class="header" style="height: 48px; padding: 0 12px; display: flex; align-items: center; border-bottom: 1px solid #00000020;">
                            <span style="font-size: 18px; font-weight: bold; color: #111;">Project Rosaura</span>
                        </div>
                    </div>
                    <div class="general-content-bottom" style="background-color: #fcfcfc;">
                        <div class="general-content-scrolleable" style="display: flex; justify-content: center; align-items: center; padding: 24px; width: 100%;">
                            <div class="view-content" style="padding: 40px 24px; text-align: center; max-width: 500px; background: #fff; border-radius: 12px; border: 1px solid #00000020; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                                <div class="component-card__icon-container component-card__icon-container--bordered" style="width: 64px; height: 64px; margin: 0 auto 16px auto;">
                                    <span class="material-symbols-rounded spin-icon" style="font-size: 32px; color: #1a73e8; animation: spin 2s linear infinite;">autorenew</span>
                                </div>
                                <h1 style="font-size: 24px; font-weight: 700; color: #111111; margin-bottom: 8px;">Restaurando Sistema</h1>
                                <p style="color: #666; font-size: 15px; margin-bottom: 24px; line-height: 1.5;">Estamos aplicando una copia de seguridad y reconstruyendo la base de datos. Para evitar corrupción de datos, el acceso al sistema se ha bloqueado temporalmente. Vuelve a intentar en unos instantes.</p>
                                <button class="component-button component-button--dark component-button--h45" onclick="window.location.reload();" style="text-decoration: none;">Actualizar página</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
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
        <link rel="stylesheet" type="text/css" href="/ProjectRosaura/public/assets/css/styles.css">
        <link rel="stylesheet" type="text/css" href="/ProjectRosaura/public/assets/css/components/components.css">
    </head>
    <body>
        <div class="page-wrapper">
            <div class="main-content">
                <div class="general-content">
                    
                    <div class="general-content-top">
                        <div class="header" style="height: 48px; padding: 0 12px; display: flex; align-items: center; border-bottom: 1px solid #00000020;">
                            <span style="font-size: 18px; font-weight: bold; color: #111;">Project Rosaura</span>
                        </div>
                    </div>

                    <div class="general-content-bottom" style="background-color: #fcfcfc;">
                        <div class="component-module component-module--sidebar" style="width: 265px; border-right: 1px solid #00000020; display: none;"></div>

                        <div class="general-content-scrolleable" style="display: flex; justify-content: center; align-items: center; padding: 24px; width: 100%;">
                            
                            <div class="view-content" style="padding: 40px 24px; text-align: center; max-width: 500px; background: #fff; border-radius: 12px; border: 1px solid #00000020; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                                <div class="component-card__icon-container component-card__icon-container--bordered" style="width: 64px; height: 64px; margin: 0 auto 16px auto;">
                                    <span class="material-symbols-rounded" style="font-size: 32px; color: #d32f2f;">gpp_bad</span>
                                </div>
                                <h1 style="font-size: 24px; font-weight: 700; color: #111111; margin-bottom: 8px;">Error Interno del Servidor</h1>
                                <p style="color: #666; font-size: 15px; margin-bottom: 24px; line-height: 1.5;">Lo sentimos, no pudimos cargar esta sección. Ha ocurrido un problema técnico en el servidor y nuestro equipo ha sido notificado.</p>
                                <a href="/ProjectRosaura/" class="component-button component-button--dark component-button--h45" style="text-decoration: none;">Volver a recargar</a>
                            </div>

                        </div>
                    </div>

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
        header("Location: /ProjectRosaura/login");
        exit;
    } else {
        // --- HIDRATACIÓN EN TIEMPO REAL ---
        $liveUser = $userRepo->findById($_SESSION['user_id']);
        
        if (!$liveUser || $liveUser['user_status'] === 'deleted') {
            $authService->logout();
            header("Location: /ProjectRosaura/account-deleted");
            exit;
        }
        
        if (isset($liveUser['is_suspended']) && $liveUser['is_suspended'] == 1) {
            if ($liveUser['suspension_type'] === 'temporary' && $liveUser['suspension_end_date'] && strtotime($liveUser['suspension_end_date']) <= time()) {
                $userRepo->liftSuspension($liveUser['id']);
            } else {
                $authService->logout();
                header("Location: /ProjectRosaura/account-suspended");
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