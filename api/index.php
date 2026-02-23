<?php
// api/index.php
session_start();
header('Content-Type: application/json');

// ========================================================================================
// --- CABECERAS DE SEGURIDAD PARA LA API ---
// ========================================================================================

// 1. Impedir completamente que la API sea enmarcada (Clickjacking)
header("X-Frame-Options: DENY");

// 2. Obligar estrictamente a que se interprete como application/json (MIME-Sniffing)
header("X-Content-Type-Options: nosniff");

// 3. CSP para APIs: Bloquea todos los recursos, no se ejecuta HTML ni scripts en una API JSON
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none';");

// ========================================================================================

// Cargar autoloader de Composer
require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Utils;

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
    // Si es FormData (ej. subida de archivos), PHP pobla $_POST y $_FILES automáticamente
    $input = $_POST;
    $input['_files'] = $_FILES; // Anexamos los archivos para mandarlos al controlador
} else {
    // Si es JSON normal
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true) ?? [];
}

// Extraer la ruta (ej. 'auth.login' o 'settings.update_avatar')
$route = $input['route'] ?? '';

if (empty($route)) {
    echo json_encode(['success' => false, 'message' => 'Ruta no especificada.']);
    exit;
}

// Cargar el mapa de rutas
$routes = require __DIR__ . '/route-map.php';

// Validar si la ruta existe en el diccionario
if (array_key_exists($route, $routes)) {
    $routeConfig = $routes[$route];
    
    // Extraer qué controlador y qué método requiere esta ruta
    $controllerName = $routeConfig['controller'];
    $action = $routeConfig['action'];

    if (class_exists($controllerName)) {
        $controller = new $controllerName();
        
        if (method_exists($controller, $action)) {
            // Ejecutar el método
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