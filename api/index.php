<?php
// api/index.php
session_start();
header('Content-Type: application/json');

// Cabeceras de seguridad
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none';");

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Helpers\Utils;
use App\Core\Container;
use App\Core\System\Logger;
use App\Api\Services\AuthServices;

// 1. Instanciar el Contenedor de Dependencias
$container = new Container();

// 2. Obtener servicios necesarios del contenedor (PSR-11)
$authService = $container->get(AuthServices::class);

// Manejo de Sesión y AutoLogin
if (isset($_SESSION['user_id'])) {
    if (!$authService->isCurrentDeviceValid()) {
        Logger::security("Sesión revocada para usuario ID: " . $_SESSION['user_id'], 'warning', ['ip' => Utils::getIpAddress()]);
        $authService->logout();
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sesión revocada.']);
        exit;
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