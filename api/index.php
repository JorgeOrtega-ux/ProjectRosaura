<?php
// api/index.php
session_start();
header('Content-Type: application/json');

// ========================================================================================
// --- CABECERAS DE SEGURIDAD PARA LA API ---
// ========================================================================================
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none';");

// Cargar autoloader de Composer
require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Utils;
use App\Api\Services\AuthServices; // <-- IMPORTACIÓN NECESARIA

// ========================================================================================
// --- AUTO-LOGIN SILENCIOSO (SESIÓN PERSISTENTE) ---
// ========================================================================================
if (!isset($_SESSION['user_id']) && isset($_COOKIE['remember_token'])) {
    $authService = new AuthServices();
    $authService->autoLogin(); 
}

// 1. OBTENER Y VALIDAR EL TOKEN CSRF DESDE LOS HEADERS DE LA PETICIÓN
$requestToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

if (!Utils::validateCSRFToken($requestToken)) {
    http_response_code(403);
    echo json_encode([
        'success' => false, 
        'message' => 'Solicitud rechazada. Token de seguridad CSRF inválido o ausente.'
    ]);
    exit;
}

// 2. Recibir los datos de la petición (Soporte para JSON y FormData)
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
        $controller = new $controllerName();
        
        if (method_exists($controller, $action)) {
            echo json_encode($controller->$action($input));
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Método de acción no encontrado en el controlador.']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Clase de controlador no encontrada.']);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'La ruta solicitada no existe.']);
}
?>