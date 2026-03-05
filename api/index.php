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
// Definimos la raíz dinámicamente (1 nivel arriba de la carpeta api)
define('ROOT_PATH', dirname(__DIR__));

// Cargamos las variables del .env
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
// Definimos APP_URL a partir de lo que cargó el .env
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
    $redisClient->ping(); // Probar conexión
    
    $sessionHandler = new \App\Core\System\RedisSessionHandler($redisClient);
    session_set_save_handler($sessionHandler, true);
    
} catch (\Exception $e) {
    // Si falla Redis, PHP usará archivos por defecto.
    error_log("API: No se pudo conectar a Redis para el manejo de sesiones. " . $e->getMessage());
}

// AHORA SÍ: Iniciamos la sesión después de decirle a PHP que busque en Redis
session_start();
// =========================================================================

use App\Core\Helpers\Utils;
use App\Core\Container;
use App\Core\System\Logger;
use App\Api\Services\AuthServices;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;

// 1. Instanciar el Contenedor de Dependencias
$container = new Container();

// 2. Obtener servicios necesarios del contenedor (PSR-11)
$authService = $container->get(AuthServices::class);
$userRepo = $container->get(UserRepositoryInterface::class);

// Manejo de Sesión, AutoLogin e Hidratación en Tiempo Real (Capa API)
if (isset($_SESSION['user_id'])) {
    if (!$authService->isCurrentDeviceValid()) {
        Logger::security("Sesión revocada para usuario ID: " . $_SESSION['user_id'], 'warning', ['ip' => Utils::getIpAddress()]);
        $authService->logout();
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sesión revocada.']);
        exit;
    } else {
        // --- HIDRATACIÓN EN TIEMPO REAL PARA RUTAS API ---
        $liveUser = $userRepo->findById($_SESSION['user_id']);
        
        if (!$liveUser || $liveUser['user_status'] === 'deleted') {
            $authService->logout();
            http_response_code(403); 
            echo json_encode(['success' => false, 'status' => 'deleted', 'message' => 'Cuenta eliminada.']);
            exit;
        }
        
        // Validación segura con isset
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
        
        // Sincronizar el rol de la petición actual
        $_SESSION['user_role'] = $liveUser['role'];
    }
} elseif (isset($_COOKIE['remember_token'])) {
    $authService->autoLogin(); 
}

// Validación de Token CSRF
$requestToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!Utils::validateCSRFToken($requestToken)) {
    Logger::security("Fallo de validación CSRF.", 'warning', ['ip' => Utils::getIpAddress(), 'token_provided' => $requestToken]);
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Token de seguridad inválido.']);
    exit;
}

// Procesamiento de Input
$contentType = $_SERVER["CONTENT_TYPE"] ?? '';
$input = [];

if (strpos($contentType, 'multipart/form-data') !== false) {
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

// === DEFENSA PROFUNDA: MODO MANTENIMIENTO (API) ===
$serverConfigRepo = $container->get(ServerConfigRepositoryInterface::class);
$serverConfig = $serverConfigRepo->getConfig();

if (isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1) {
    $currentUserRole = $_SESSION['user_role'] ?? 'user';
    $isPrivileged = in_array($currentUserRole, ['administrator', 'founder']);
    
    // Si no es admin/founder y la ruta no es logout (para no dejarlos atrapados)
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
// ==================================================

// Cargar el mapa de rutas
$routes = require __DIR__ . '/route-map.php';

if (array_key_exists($route, $routes)) {
    $routeConfig = $routes[$route];
    
    $controllerName = $routeConfig['controller'];
    $action = $routeConfig['action'];

    try {
        // 3. RESOLUCIÓN VÍA CONTENEDOR (Composition Root real)
        $controller = $container->get($controllerName);
        
        if (method_exists($controller, $action)) {
            echo json_encode($controller->$action($input));
        } else {
            Logger::security("Acción no encontrada en el controlador: {$action} en {$controllerName}", 'error');
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Ocurrió un error interno en el servidor.']);
        }
    } catch (\PDOException $e) {
        // Diferenciamos errores de BD para mandarlos a su carpeta específica
        Logger::database("Excepción de Base de Datos en ruta {$route}: " . $e->getMessage(), 'error', ['trace' => $e->getTraceAsString()]);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Ocurrió un error interno en el servidor.']);
    } catch (\Exception $e) {
        // Errores generales
        Logger::security("Excepción General en ruta {$route}: " . $e->getMessage(), 'error', ['trace' => $e->getTraceAsString()]);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Ocurrió un error interno en el servidor.']);
    } catch (\Error $e) {
        // Captura de errores fatales de PHP
        Logger::security("Error Fatal en ruta {$route}: " . $e->getMessage(), 'error', ['trace' => $e->getTraceAsString()]);
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Ocurrió un error interno en el servidor.']);
    }
} else {
    Logger::security("Intento de acceso a ruta inexistente: {$route}", 'warning', ['ip' => Utils::getIpAddress()]);
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Ruta no existe.']);
}
?>