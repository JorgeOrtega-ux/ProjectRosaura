<?php
// api/index.php
session_start();
header('Content-Type: application/json');

// Cabeceras de seguridad
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none';");

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Utils;
use App\Core\Container;

// 1. Instanciar el Contenedor de Dependencias
$container = new Container();

// 2. Obtener servicios necesarios del contenedor
$authService = $container->getAuthServices();

// Manejo de Sesión y AutoLogin
if (isset($_SESSION['user_id'])) {
    if (!$authService->isCurrentDeviceValid()) {
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
        // El contenedor ya sabe cómo instanciar AuthController y SettingsController con sus servicios
        $controller = $container->get($controllerName);
        
        if (method_exists($controller, $action)) {
            echo json_encode($controller->$action($input));
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Acción no encontrada en el controlador.']);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Ruta no existe.']);
}
?>