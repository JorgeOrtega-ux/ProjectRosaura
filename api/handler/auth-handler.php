<?php
// api/handler/auth-handler.php

// Requerimos los servicios. 
// Subimos un nivel de directorio porque estamos dentro de api/handler/
require_once __DIR__ . '/../auth-services.php';

$authServices = new AuthServices();

// Ejecutamos el método correspondiente según la 'action' dictada por el route-map.php
switch ($action) {
    case 'register':
        echo json_encode($authServices->register($input));
        break;
        
    case 'login':
        echo json_encode($authServices->login($input));
        break;
        
    case 'logout':
        echo json_encode($authServices->logout());
        break;
        
    default:
        echo json_encode(['success' => false, 'message' => 'Acción no válida en el handler de autenticación.']);
        break;
}
?>