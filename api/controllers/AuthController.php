<?php
// api/controllers/AuthController.php

namespace App\Api\Controllers;

use App\Api\Services\AuthServices;

class AuthController {
    
    private $authServices;

    public function __construct(AuthServices $authServices) {
        $this->authServices = $authServices;
    }

    public function register_step1($input) { return $this->authServices->registerStep1($input); }
    public function register_step2($input) { return $this->authServices->registerStep2($input); }
    public function register_verify($input) { return $this->authServices->registerVerify($input); }
    public function register_resend_code() { return $this->authServices->registerResendCode(); }
    public function login($input) { return $this->authServices->login($input); }
    public function login_verify_2fa($input) { return $this->authServices->loginVerify2FA($input); }
    public function logout() { return $this->authServices->logout(); }
    public function forgot_password($input) { return $this->authServices->forgotPassword($input); }
    public function reset_password($input) { return $this->authServices->resetPassword($input); }
    
    // NUEVO: Endpoint para refrescar la información de sesión en el frontend (incluye is_creator)
    public function me() {
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (isset($_SESSION['user_id'])) {
            return [
                'success' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['user_name'],
                    'email' => $_SESSION['user_email'],
                    'role' => $_SESSION['user_role'],
                    'is_creator' => $_SESSION['is_creator'] ?? 0,
                    'profile_picture' => $_SESSION['user_pic'] ?? '',
                    'identifier' => $_SESSION['user_identifier'] ?? ''
                ]
            ];
        }
        http_response_code(401);
        return ['success' => false, 'message' => 'No hay sesión activa.'];
    }
}
?>