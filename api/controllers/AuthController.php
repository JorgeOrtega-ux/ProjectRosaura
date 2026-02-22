<?php
// api/controllers/AuthController.php

namespace App\Api\Controllers;

use App\Api\Services\AuthServices;

class AuthController {
    
    private $authServices;

    public function __construct() {
        // Instanciamos el servicio una sola vez al construir el controlador
        $this->authServices = new AuthServices();
    }

    public function register_step1($input) {
        return $this->authServices->registerStep1($input);
    }

    public function register_step2($input) {
        return $this->authServices->registerStep2($input);
    }

    public function register_verify($input) {
        return $this->authServices->registerVerify($input);
    }

    public function login($input) {
        return $this->authServices->login($input);
    }

    public function logout() {
        // En el caso de logout, no se requiere enviar $input, pero el index lo pasa igual por defecto
        return $this->authServices->logout();
    }
}
?>