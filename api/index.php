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

// Cargar el mapa de rutas (Este require se queda porque carga un arreglo de configuración)
$routes = require __DIR__ . '/route-map.php';

// Validar si la ruta existe en el diccionario
if (array_key_exists($route, $routes)) {
    $routeConfig = $routes[$route];
    
    // Extraer qué controlador y qué método (acción) requiere esta ruta
    $controllerName = $routeConfig['controller'];
    $action = $routeConfig['action'];

    // Validar que la clase del Controlador exista (el Autoloader la buscará automáticamente)
    if (class_exists($controllerName)) {
        // Instanciar el controlador dinámicamente
        $controller = new $controllerName();
        
        // Validar que el método exista dentro del controlador
        if (method_exists($controller, $action)) {
            // Ejecutar el método y pasarle el input, retornando la respuesta en JSON
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