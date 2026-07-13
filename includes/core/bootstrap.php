<?php

define('ROOT_PATH', dirname(__DIR__, 2));

header("X-Frame-Options: SAMEORIGIN");
header("X-Content-Type-Options: nosniff");
require_once ROOT_PATH . '/vendor/autoload.php';

\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

$s3Host = $_ENV['MINIO_PUBLIC_URL'] ?? 'http://localhost:9000';
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://challenges.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://api.qrserver.com {$s3Host}; connect-src 'self' https://unpkg.com https://cdn.jsdelivr.net ws: wss:; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none';");


if (!isset($_ENV['APP_URL'])) {
    die("Critical Failure: APP_URL is not defined in the environment.");
}
define('APP_URL', rtrim($_ENV['APP_URL'], '/'));
define('APP_NAME', $_ENV['APP_NAME'] ?? 'ProjectRosaura');

$appTimezone = $_ENV['APP_TIMEZONE'] ?? 'UTC';
date_default_timezone_set($appTimezone);

$redisClient = null;
try {
    if (getenv('REDIS_HOST') && getenv('REDIS_PORT')) {
        $redisParams = ['scheme' => 'tcp', 'host' => getenv('REDIS_HOST'), 'port' => (int)getenv('REDIS_PORT')];
        if (getenv('REDIS_PASS')) $redisParams['password'] = getenv('REDIS_PASS');
        
        $redisClient = new \Predis\Client($redisParams);
        $redisClient->ping(); 
        
        $redisHost = getenv('REDIS_HOST') ?: '127.0.0.1';
        $redisPass = getenv('REDIS_PASS') ?: '';
        ini_set('session.save_handler', 'redis');
        $redisPath = "tcp://$redisHost:6379" . (!empty($redisPass) ? "?auth=$redisPass" : "");
        ini_set('session.save_path', $redisPath);
    }
} catch (\Throwable $e) {}

try {
    if (session_status() === PHP_SESSION_NONE) {
        $cookieParams = session_get_cookie_params();
        session_set_cookie_params([
            'lifetime' => $cookieParams['lifetime'],
            'path' => '/',
            'domain' => $cookieParams['domain'],
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_start();
    }
} catch (\Throwable $e) {
    $_SESSION = [];
}

function render_restoring_view() {
    http_response_code(503); 
    if (isset($_SERVER['HTTP_X_SPA_REQUEST']) || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)) {
        echo json_encode(['success' => false, 'status' => 'restoring', 'message' => 'Restoring backup.']);
        exit;
    }
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>System Restoring - ' . htmlspecialchars(APP_NAME) . '</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" /><link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/root.css"><link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/styles.css"><link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/components/components.css"></head><body><div class="view-content"><div class="component-layout-centered"><div class="component-wrapper"><div class="component-header-card"><div class="component-spinner component-spinner--centered"></div><br><h1 class="component-page-title">System Restoring</h1><p class="component-page-description">Applying backup. Please try again shortly.</p><br><button class="component-button component-button--dark component-button--h45" onclick="window.location.reload();">Refresh page</button></div></div></div></div></body></html>';
    exit;
}

try {
    if ($redisClient && $redisClient->exists('system_status:restoring')) {
        render_restoring_view();
    }
} catch (\Throwable $e) {}

ini_set('display_errors', 0);
error_reporting(E_ALL);

function render_fatal_error_view() {
    http_response_code(500);
    $isJsonReq = (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);
    
    if (isset($_SERVER['HTTP_X_SPA_REQUEST'])) {
        echo ''; 
        exit;
    }

    if ($isJsonReq) {
        echo json_encode(['success' => false, 'message' => 'Error interno o de conexión.']);
        exit;
    }
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Internal Error - ' . htmlspecialchars(APP_NAME) . '</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" /><link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/root.css"><link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/styles.css"><link rel="stylesheet" type="text/css" href="' . APP_URL . '/public/assets/css/components/components.css"></head><body><div class="view-content"><div class="component-message-layout"><div class="component-message-box"><div class="component-message-icon-wrapper"><span class="material-symbols-rounded component-message-icon">gpp_bad</span></div><h1 class="component-message-title">Internal Server Error</h1><p class="component-message-desc">Sorry, we couldn\'t load this section due to connection issues.</p><br><a href="' . APP_URL . '/" class="component-button component-button--dark component-button--h45">Reload</a></div></div></div></body></html>';
    exit;
}

set_exception_handler(function (\Throwable $e) {
    if (class_exists('\App\Core\System\Logger')) {
        \App\Core\System\Logger::security("Fatal Exception: " . $e->getMessage(), 'critical', ['trace' => $e->getTraceAsString()]);
    }
    render_fatal_error_view();
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (class_exists('\App\Core\System\Logger')) {
            \App\Core\System\Logger::security("Fatal Error: " . $error['message'], 'critical');
        }
        render_fatal_error_view();
    }
});

use App\Core\Helpers\Utils; 
use App\Core\System\Translator; 
use App\Core\Container;
use App\Api\Services\Auth\AuthServices;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;

$container = new Container();
$serverConfig = [];
$isSystemDegraded = false;
$sessionManager = $container->get(SessionManagerInterface::class);

try {
    $configRepo = $container->get(ServerConfigRepositoryInterface::class);
    $serverConfig = $configRepo->getConfig();

    $authService = $container->get(AuthServices::class);
    $prefsManager = $container->get(UserPrefsManagerInterface::class);
    $userRepo = $container->get(UserRepositoryInterface::class);
    if ($sessionManager->isLoggedIn()) {
        if (!$authService->isCurrentDeviceValid()) {
            $authService->logout();
            if ($sessionManager->isLoggedIn()) {
                header("Location: " . APP_URL . "/?account_switched=1");
            } else {
                header("Location: " . APP_URL . "/login?reason=session_expired");
            }
            exit;
            
        } else {
            $activeId = $sessionManager->getActiveAccountId();
            $liveUser = $userRepo->findById($activeId);
            if (!$liveUser || !empty($liveUser['deletion_scheduled_at'])) {
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
            $permissions = !empty($liveUser['permissions']) ? explode(',', $liveUser['permissions']) : [];
            $accounts = $sessionManager->get(\App\Core\System\SessionConstants::KEY_LINKED_ACCOUNTS, []);
            if (isset($accounts[$activeId])) {
                $accounts[$activeId]['user_role_id'] = $liveUser['role_id'] ?? null;
                $accounts[$activeId]['user_role_name'] = $liveUser['role_name'] ?? 'User';
                $accounts[$activeId]['user_role_color'] = $liveUser['role_color'] ?? '#808080';
                $accounts[$activeId]['user_permissions'] = $permissions;
                $accounts[$activeId]['user_pic'] = $liveUser['profile_picture'] ?? null;
                $accounts[$activeId]['subscription_tier'] = (int)($liveUser['subscription_tier'] ?? 0);
                $sessionManager->set(\App\Core\System\SessionConstants::KEY_LINKED_ACCOUNTS, $accounts);
                $sessionManager->syncRootState();
            }
        }
    } elseif (isset($_COOKIE['remember_token']) || isset($_COOKIE['remember_tokens'])) {
        $authService->autoLogin(); 
    }

    $isLoggedIn = $sessionManager->isLoggedIn();

    if ($isLoggedIn && !$sessionManager->has('user_prefs')) {
        $activeId = $sessionManager->getActiveAccountId();
        $sessionManager->set('user_prefs', $prefsManager->ensureDefaultPreferences($activeId));
    }

} catch (\Throwable $e) {
    $isSystemDegraded = true;
    $isLoggedIn = false;
}

define('SYSTEM_DEGRADED', $isSystemDegraded);

$csrfToken = Utils::generateCSRFToken($sessionManager);

$lang = 'es-419';
$userPrefs = $sessionManager->get('user_prefs', []);

if ($isLoggedIn && !empty($userPrefs['language'])) {
    $lang = $userPrefs['language'];
} elseif (isset($_COOKIE['pr_language'])) {
    $lang = $_COOKIE['pr_language']; 
} else {
    $lang = Utils::getClosestLanguage($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
}

try { Translator::init($lang); } catch (\Throwable $e) {}

if (!function_exists('__')) { 
    function __($key, $params = []) { 
        try { return Translator::get($key, $params); } catch (\Throwable $e) { return $key; }
    } 
}
?>