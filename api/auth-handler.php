<?php
// api/auth-handler.php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/auth-services.php';

$authServices = new AuthServices();

// Recibir datos JSON
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

$action = $input['action'] ?? '';

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
        echo json_encode(['success' => false, 'message' => 'Acción no válida.']);
        break;
}
?>