<?php
// api/index.php

header('Content-Type: application/json');

// Cabeceras de seguridad
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none';");

require_once __DIR__ . '/../vendor/autoload.php';

// =========================================================================
// INICIALIZACIÓN DE ENTORNO PARA LA API
// =========================================================================
define('ROOT_PATH', dirname(__DIR__));

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
define('APP_URL', rtrim($_ENV['APP_URL'] ?? '', '/'));

// =========================================================================
// INTERCEPCIÓN DE SESIONES CON REDIS EN LA API
// =========================================================================
try {
    $redisHost = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
    $redisPort = (int)($_ENV['REDIS_PORT'] ?? 6379);
    $redisParams = ['scheme' => 'tcp', 'host' => $redisHost, 'port' => $redisPort];
    if (!empty($_ENV['REDIS_PASS'])) {
        $redisParams['password'] = $_ENV['REDIS_PASS'];
    }
    
    $redisClient = new \Predis\Client($redisParams);
    $redisClient->ping(); 
    
    $sessionHandler = new \App\Core\System\RedisSessionHandler($redisClient);
    session_set_save_handler($sessionHandler, true);
    
} catch (\Exception $e) {
    error_log("API: No se pudo conectar a Redis para el manejo de sesiones. " . $e->getMessage());
}

session_start();
// =========================================================================

use App\Core\Helpers\Utils;
use App\Core\Container;
use App\Core\System\Logger;
use App\Api\Services\AuthServices;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;

$container = new Container();
$authService = $container->get(AuthServices::class);
$userRepo = $container->get(UserRepositoryInterface::class);

if (isset($_SESSION['user_id'])) {
    if (!$authService->isCurrentDeviceValid()) {
        Logger::security("Sesión revocada para usuario ID: " . $_SESSION['user_id'], 'warning', ['ip' => Utils::getIpAddress()]);
        $authService->logout();
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sesión revocada.']);
        exit;
    } else {
        $liveUser = $userRepo->findById($_SESSION['user_id']);
        if (!$liveUser || $liveUser['user_status'] === 'deleted') {
            $authService->logout();
            http_response_code(403); 
            echo json_encode(['success' => false, 'status' => 'deleted', 'message' => 'Cuenta eliminada.']);
            exit;
        }
        if (isset($liveUser['is_suspended']) && $liveUser['is_suspended'] == 1) {
            if ($liveUser['suspension_type'] === 'temporary' && $liveUser['suspension_end_date'] && strtotime($liveUser['suspension_end_date']) <= time()) {
                $userRepo->liftSuspension($liveUser['id']);
            } else {
                $authService->logout();
                http_response_code(403);
                echo json_encode(['success' => false, 'status' => 'suspended', 'message' => 'Cuenta suspendida.']);
                exit;
            }
        }
        $_SESSION['user_role'] = $liveUser['role'];
    }
} elseif (isset($_COOKIE['remember_token'])) {
    $authService->autoLogin(); 
}

// =========================================================================
// 1. PROCESAMIENTO DE INPUT (Soporte añadido para GET)
// =========================================================================
$contentType = $_SERVER["CONTENT_TYPE"] ?? '';
$input = [];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $input = $_GET;
} elseif (strpos($contentType, 'multipart/form-data') !== false) {
    $input = $_POST;
    $input['_files'] = $_FILES; 
} else {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true) ?? [];
}

$route = $input['route'] ?? '';
if (empty($route)) {
    Logger::security("Petición sin ruta especificada.", 'warning', ['ip' => Utils::getIpAddress()]);
    echo json_encode(['success' => false, 'message' => 'Ruta no especificada.']);
    exit;
}

// =========================================================================
// 2. VALIDACIÓN DE TOKEN CSRF (Excepción para el Reproductor HLS)
// =========================================================================
$requestToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

// La ruta media.stream no usa CSRF porque depende de tokens URL dinámicos
if ($route !== 'media.stream' && !Utils::validateCSRFToken($requestToken)) {
    Logger::security("Fallo de validación CSRF.", 'warning', ['ip' => Utils::getIpAddress(), 'token_provided' => $requestToken]);
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Token de seguridad inválido.']);
    exit;
}

// =========================================================================
// 3. DEFENSA PROFUNDA: MODO MANTENIMIENTO
// =========================================================================
$serverConfigRepo = $container->get(ServerConfigRepositoryInterface::class);
$serverConfig = $serverConfigRepo->getConfig();

if (isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1) {
    $currentUserRole = $_SESSION['user_role'] ?? 'user';
    $isPrivileged = in_array($currentUserRole, ['administrator', 'founder']);
    
    if (!$isPrivileged && $route !== 'auth.logout') {
        Logger::security("Petición API bloqueada por Mantenimiento. Ruta: {$route}", 'info', ['ip' => Utils::getIpAddress()]);
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'status' => 'maintenance', 
            'message' => 'El sistema se encuentra en mantenimiento. Por favor, intente más tarde.'
        ]);
        exit;
    }
}

// =========================================================================
// 4. DESPACHO DE RUTAS
// =========================================================================
$routes = require __DIR__ . '/route-map.php';

if (array_key_exists($route, $routes)) {
    $routeConfig = $routes[$route];
    
    $controllerName = $routeConfig['controller'];
    $action = $routeConfig['action'];

    try {
        $controller = $container->get($controllerName);
        
        if (method_exists($controller, $action)) {
            // No imprimir json_encode si es el stream de medios
            if ($route === 'media.stream') {
                $controller->$action($input);
            } else {
                echo json_encode($controller->$action($input));
            }
        } else {
            Logger::security("Acción no encontrada: {$action} en {$controllerName}", 'error');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Ocurrió un error interno en el servidor.']);
        }
    } catch (\PDOException $e) {
        Logger::database("Excepción BD en ruta {$route}: " . $e->getMessage(), 'error');
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno en la BD.']);
    } catch (\Exception | \Error $e) {
        Logger::security("Error crítico en ruta {$route}: " . $e->getMessage(), 'error');
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Ocurrió un error interno en el servidor.']);
    }
} else {
    Logger::security("Intento de acceso a ruta inexistente: {$route}", 'warning', ['ip' => Utils::getIpAddress()]);
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Ruta no existe.']);
}
?>