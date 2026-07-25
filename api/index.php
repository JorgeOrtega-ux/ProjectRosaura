<?php

ob_start();
ini_set('display_errors', '0');
ini_set('memory_limit', '512M');
error_reporting(E_ALL);

header('Content-Type: application/json');

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code(500);
        }
        
        $errorMsg = $error['message'] . ' in ' . $error['file'] . ':' . $error['line'];
        
        if (class_exists('App\\Core\\System\\Logger', false)) {
            try {
                \App\Core\System\Logger::critical('Fatal shutdown error: ' . $errorMsg, ['error' => $error]);
            } catch (\Throwable $e) {}
        }
        
        echo json_encode([
            'success' => false,
            'message_key' => 'error.internal_server_error'
        ]);
    }
});

header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none';");

require_once __DIR__ . '/../vendor/autoload.php';

define('ROOT_PATH', dirname(__DIR__));

\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

if (!isset($_ENV['APP_URL'])) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message_key' => 'error.environment_not_configured']);
    exit;
}
define('APP_URL', rtrim($_ENV['APP_URL'], '/'));

use App\Core\Helpers\Utils;
use App\Core\Container;
use App\Core\System\Logger;
use App\Core\System\Translator;
use App\Api\Services\Auth\AuthServices;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Core\Routing\MiddlewarePipeline;
use App\Core\Interfaces\SessionManagerInterface;

if (!function_exists('__')) { 
    function __($key, $params = []) { 
        try { 
            return Translator::get($key, $params); 
        } catch (\Throwable $e) { 
            return $key; 
        }
    } 
}

if (Utils::isMaintenanceActive()) {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true) ?? [];
    
    if (isset($input['route']) && $input['route'] === 'admin.backups.check_worker_status') {
        http_response_code(200);
        echo json_encode([
            'success' => true, 
            'status' => 'maintenance', 
            'message_key' => 'admin.maintenance_active_worker_alive'
        ]);
        exit;
    }

    http_response_code(503);
    echo json_encode([
        'success' => false, 
        'status' => 'maintenance', 
        'message_key' => 'error.maintenance_mode_active'
    ]);
    exit;
}

try {
    if (getenv('REDIS_HOST') && getenv('REDIS_PORT')) {
        $redisHost = getenv('REDIS_HOST');
        $redisPort = (int)getenv('REDIS_PORT');
        $redisParams = ['scheme' => 'tcp', 'host' => $redisHost, 'port' => $redisPort];
        
        if (getenv('REDIS_PASS')) {
            $redisParams['password'] = getenv('REDIS_PASS');
        }
        
        $redisClient = new \Predis\Client($redisParams);
        $redisClient->ping(); 
        
        $redisHostNative = getenv('REDIS_HOST');
        $redisPassNative = getenv('REDIS_PASS');
        ini_set('session.save_handler', 'redis');
        $redisPath = "tcp://$redisHostNative:6379" . (!empty($redisPassNative) ? "?auth=$redisPassNative" : "");
        ini_set('session.save_path', $redisPath);
    } else {
        throw new \Exception("REDIS_HOST or REDIS_PORT variables are not defined in the API environment.");
    }
} catch (\Exception $e) {
    Logger::critical("API: Could not connect to Redis for session management. " . $e->getMessage());
}

if (session_status() === PHP_SESSION_NONE) {
    $cookieParams = session_get_cookie_params();
    session_set_cookie_params([
        'lifetime' => $cookieParams['lifetime'],
        'path' => '/',
        'domain' => $cookieParams['domain'],
        'secure' => Utils::isSecureConnection(),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

$container = new Container();

try {
    $rateLimiter = $container->get(\App\Core\Interfaces\RateLimiterInterface::class);
    
    $globalLimit = $rateLimiter->consume('global_api_traffic', 150, 1);
    
    if (!$globalLimit['allowed']) {
        http_response_code(429);
        echo json_encode([
            'success' => false, 
            'message_key' => 'error.global_rate_limit_exceeded'
        ]);
        exit;
    }
} catch (\Exception $e) {
    Logger::error("Failed to execute Global Rate Limiter", ['exception' => $e]);
}

$serverConfig = [];
$sessionManager = $container->get(SessionManagerInterface::class);

try {
    $authService = $container->get(AuthServices::class);
    $userRepo = $container->get(UserRepositoryInterface::class);

    if ($sessionManager->isLoggedIn()) {
        if (!$authService->isCurrentDeviceValid()) {
            Logger::security("Session revoked for user ID: " . $sessionManager->getActiveAccountId(), 'warning', ['ip' => Utils::getIpAddress()]);
            $authService->logout();
            http_response_code(401);
            echo json_encode(['success' => false, 'message_key' => 'error.session_revoked']);
            exit;
        } else {
            $liveUser = $userRepo->findById($sessionManager->getActiveAccountId());
            
            if (!$liveUser || !empty($liveUser['deletion_scheduled_at'])) {
                $authService->logout();
                http_response_code(403); 
                echo json_encode(['success' => false, 'status' => 'deleted', 'message_key' => 'error.account_deleted']);
                exit;
            }
            
            if (isset($liveUser['is_suspended']) && $liveUser['is_suspended'] == 1) {
                if ($liveUser['suspension_type'] === 'temporary' && $liveUser['suspension_end_date'] && strtotime($liveUser['suspension_end_date']) <= time()) {
                    $userRepo->liftSuspension($liveUser['id']);
                } else {
                    $authService->logout();
                    http_response_code(403);
                    echo json_encode(['success' => false, 'status' => 'suspended', 'message_key' => 'error.account_suspended']);
                    exit;
                }
            }
            
            $sessionManager->set('user_role', $liveUser['role_name'] ?? '');
        }
    } elseif (isset($_COOKIE['remember_tokens']) || isset($_COOKIE['remember_token'])) {
        $authService->autoLogin(); 
    }

    $serverConfigRepo = $container->get(ServerConfigRepositoryInterface::class);
    $serverConfig = $serverConfigRepo->getConfig();

} catch (\Exception $e) {
    file_put_contents(__DIR__ . '/debug_fatal_error.txt', date('Y-m-d H:i:s') . ' - ' . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['success' => false, 'message_key' => 'error.database_offline']);
    exit;
}

$lang = 'es-419';
$userPrefs = $sessionManager->get('user_prefs', []);

if ($sessionManager->isLoggedIn() && !empty($userPrefs['language'])) {
    $lang = $userPrefs['language'];
} elseif (isset($_COOKIE['pr_language'])) {
    $lang = $_COOKIE['pr_language']; 
} else {
    $lang = Utils::getClosestLanguage($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
}

try { 
    Translator::init($lang); 
} catch (\Throwable $e) {
    Logger::error("Failed to initialize translator system in API context. " . $e->getMessage());
}

if (!function_exists('__')) { 
    function __($key, $params = []) { 
        try { 
            return Translator::get($key, $params); 
        } catch (\Throwable $e) { 
            return $key; 
        }
    } 
}

$requestRoute = $_GET['route'] ?? ($_POST['route'] ?? '');
if ($requestRoute === 'csrf.refresh' || $requestRoute === 'auth.csrf') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'csrf_token' => $sessionManager->getCsrfToken()
    ]);
    exit;
}

$requestToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_GET['csrf_token'] ?? '');
$isChatAttachment = ($_SERVER['REQUEST_METHOD'] === 'GET' && ($requestRoute === 'chat.attachment'));
$isReceiptDownload = ($requestRoute === 'stripe.download_receipt');

if (!$isChatAttachment && !$isReceiptDownload && !Utils::validateCSRFToken($requestToken, $sessionManager)) {
    Logger::security("CSRF validation failed.", 'warning', ['ip' => Utils::getIpAddress(), 'token_provided' => $requestToken]);
    http_response_code(403);
    echo json_encode([
        'success' => false, 
        'message_key' => 'error.invalid_csrf_token',
        'csrf_token' => $sessionManager->getCsrfToken()
    ]);
    exit;
}

$contentType = $_SERVER["CONTENT_TYPE"] ?? '';
$input = [];

if (strpos($contentType, 'multipart/form-data') !== false) {
    $input = $_POST;
    $input['_files'] = $_FILES; 
} else {
    if (empty($input)) {
        $inputJSON = file_get_contents('php://input');
        $input = json_decode($inputJSON, true) ?? [];
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $input = array_merge($input, $_GET);
}

$route = $input['route'] ?? '';
if (empty($route)) {
    Logger::security("Request without specified route.", 'warning', ['ip' => Utils::getIpAddress()]);
    echo json_encode(['success' => false, 'message_key' => 'error.route_missing']);
    exit;
}

if (isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1) {
    $userPermissions = $sessionManager->get('user_permissions') ?? [];
    $isPrivileged = in_array('access_admin_panel', $userPermissions);
    
    if (!$isPrivileged && $route !== 'auth.logout') {
        Logger::security("API request blocked by Maintenance mode. Route: {$route}", 'info', ['ip' => Utils::getIpAddress()]);
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'status' => 'maintenance', 
            'message_key' => 'error.maintenance_mode_active'
        ]);
        exit;
    }
}

$routes = require __DIR__ . '/route-map.php';

if (array_key_exists($route, $routes)) {
    $routeConfig = $routes[$routes[$route] ? $route : ''];
    
    $controllerName = $routeConfig['controller'];
    $action = $routeConfig['action'];

    $middlewaresConfig = $routeConfig['middleware'] ?? [];
    if (!empty($middlewaresConfig)) {
        $pipeline = new MiddlewarePipeline($container);
        $pipelinePassed = $pipeline->process($middlewaresConfig, $input);
        
        if (!$pipelinePassed) {
            exit; 
        }
    }

    try {
        $controller = $container->get($controllerName);
        
        if (method_exists($controller, $action)) {
            echo json_encode($controller->$action($input));
        } else {
            Logger::security("Action not found in controller: {$action} in {$controllerName}", 'error');
            http_response_code(500);
            echo json_encode(['success' => false, 'message_key' => 'error.internal_server_error']);
        }
    } catch (\PDOException $e) {
        Logger::database("Database Exception in route {$route}: " . $e->getMessage(), 'error', ['exception' => $e]);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message_key' => 'error.internal_server_error'
        ]);
    } catch (\Exception $e) {
        Logger::error("General Exception in route {$route}: " . $e->getMessage(), ['exception' => $e]);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message_key' => 'error.internal_server_error'
        ]);
    } catch (\Error $e) {
        Logger::error("Fatal Error in route {$route}: " . $e->getMessage(), ['exception' => $e]);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message_key' => 'error.internal_server_error'
        ]);
    }
} else {
    Logger::security("Attempted access to non-existent route: {$route}", 'warning', ['ip' => Utils::getIpAddress()]);
    http_response_code(404);
    echo json_encode(['success' => false, 'message_key' => 'error.route_not_found', 'debug_route' => $route]);
}
?>