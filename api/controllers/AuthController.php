<?php
// api/controllers/AuthController.php

namespace App\Api\Controllers;

use App\Api\Services\AuthServices;
use App\Config\Database;
use App\Core\RateLimiter;
use App\Core\UserPrefsManager;

class AuthController {
    
    private $authServices;

    public function __construct() {
        $db = new Database();
        $pdo = $db->getConnection();
        $rateLimiter = new RateLimiter($pdo);
        $prefsManager = new UserPrefsManager($pdo);
        
        // Inyección de Dependencias
        $this->authServices = new AuthServices($pdo, $rateLimiter, $prefsManager);
    }

    public function register_step1($input) { return $this->authServices->registerStep1($input); }
    public function register_step2($input) { return $this->authServices->registerStep2($input); }
    public function register_verify($input) { return $this->authServices->registerVerify($input); }
    public function login($input) { return $this->authServices->login($input); }
    public function login_verify_2fa($input) { return $this->authServices->loginVerify2FA($input); }
    public function logout() { return $this->authServices->logout(); }
    public function forgot_password($input) { return $this->authServices->forgotPassword($input); }
    public function reset_password($input) { return $this->authServices->resetPassword($input); }
}
?>