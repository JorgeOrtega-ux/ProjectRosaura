<?php
// api/handler/auth-handler.php

require_once __DIR__ . '/../services/auth-services.php';

$authServices = new AuthServices();

switch ($action) {
    case 'register_step1':
        echo json_encode($authServices->registerStep1($input));
        break;

    case 'register_step2':
        echo json_encode($authServices->registerStep2($input));
        break;

    case 'register_verify':
        echo json_encode($authServices->registerVerify($input));
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