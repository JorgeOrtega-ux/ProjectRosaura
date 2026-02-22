<?php
// api/index.php
session_start();
header('Content-Type: application/json');

// Cargar autoloader de Composer
require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Utils;

// 1. OBTENER Y VALIDAR EL TOKEN CSRF DESDE LOS HEADERS DE LA PETICIÓN
// PHP convierte las cabeceras personalizadas a mayúsculas y les agrega HTTP_
$requestToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

if (!Utils::validateCSRFToken($requestToken)) {
    http_response_code(403);
    echo json_encode([
        'success' => false, 
        'message' => 'Solicitud rechazada. Token de seguridad CSRF inválido o ausente.'
    ]);
    exit;
}

// 2. Recibir los datos crudos del fetch
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true) ?? [];

// Extraer la ruta (ej. 'auth.login')
$route = $input['route'] ?? '';

if (empty($route)) {
    echo json_encode(['success' => false, 'message' => 'Ruta no especificada.']);
    exit;
}

// Cargar el mapa de rutas (Este require se queda porque carga un arreglo, no una clase)
$routes = require __DIR__ . '/route-map.php';

// Validar si la ruta existe en el diccionario
if (array_key_exists($route, $routes)) {
    $routeConfig = $routes[$route];
    
    // Extraer qué archivo y qué acción requiere esta ruta
    $handlerFile = __DIR__ . '/' . $routeConfig['file'];
    $action = $routeConfig['action'];

    if (file_exists($handlerFile)) {
        // Al hacer require, el archivo handler podrá leer las variables $action y $input
        require_once $handlerFile;
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Archivo handler no encontrado.']);
    }
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'La ruta solicitada no existe.']);
}
?>