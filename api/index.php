<?php
// api/index.php
session_start();
header('Content-Type: application/json');

header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none';");

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Utils;
use App\Config\Database;
use App\Core\RateLimiter;
use App\Core\UserPrefsManager;
use App\Api\Services\AuthServices;
use App\Api\Services\SettingsServices;

// Instanciar dependencias compartidas (ÚNICA CONEXIÓN A BD POR REQUEST)
$db = new Database();
$pdo = $db->getConnection();
$rateLimiter = new RateLimiter($pdo);
$prefsManager = new UserPrefsManager($pdo);

// Inyección al AuthServices global para validar sesiones
$authService = new AuthServices($pdo, $rateLimiter, $prefsManager);

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

$requestToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!Utils::validateCSRFToken($requestToken)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Token de seguridad inválido.']);
    exit;
}

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

$routes = require __DIR__ . '/route-map.php';

if (array_key_exists($route, $routes)) {
    $routeConfig = $routes[$route];
    
    $controllerName = $routeConfig['controller'];
    $action = $routeConfig['action'];

    if (class_exists($controllerName)) {
        // COMPOSITION ROOT: Ensamblaje e Inyección de Dependencias
        if ($controllerName === 'App\Api\Controllers\AuthController') {
            $controller = new $controllerName($authService);
        } elseif ($controllerName === 'App\Api\Controllers\SettingsController') {
            $settingsService = new SettingsServices($pdo, $rateLimiter);
            $controller = new $controllerName($settingsService);
        } else {
            // Fallback por si hay Controladores sin inyección requerida
            $controller = new $controllerName();
        }
        
        if (method_exists($controller, $action)) {
            echo json_encode($controller->$action($input));
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Acción no encontrada.']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Controlador no encontrado.']);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Ruta no existe.']);
}
?>