<?php
// api/controllers/AuthController.php

namespace App\Api\Controllers;

use App\Api\Services\AuthServices;
use App\Core\Security\TurnstileValidator;
use App\Core\Helpers\Utils; // Importación añadida para mitigación de IP Spoofing

class AuthController extends BaseController {
    
    private $authServices;
    private $turnstile;

    public function __construct(AuthServices $authServices) {
        $this->authServices = $authServices;
        $this->turnstile = new TurnstileValidator();
    }

    public function register_step1($input) {
        $turnstileToken = $input['turnstile_token'] ?? null;
        if (!$this->turnstile->isValid($turnstileToken, Utils::getIpAddress())) {
            return ['success' => false, 'message_key' => 'error.captcha_failed'];
        }

        $safeInput = [
            'email' => $input['email'] ?? null,
            'password' => $input['password'] ?? null
        ];
        try { return $this->authServices->registerStep1($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function register_step2($input) {
        $safeInput = [
            'username' => $input['username'] ?? null,
            'reg_token' => $input['reg_token'] ?? null
        ];
        try { return $this->authServices->registerStep2($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function register_verify($input) {
        $safeInput = [
            'code' => $input['code'] ?? null,
            'reg_token' => $input['reg_token'] ?? null
        ];
        try { return $this->authServices->registerVerify($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function register_resend_code($input) {
        $safeInput = [
            'reg_token' => $input['reg_token'] ?? null
        ];
        try { return $this->authServices->registerResendCode($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function login($input) {
        $turnstileToken = $input['turnstile_token'] ?? null;
        if (!$this->turnstile->isValid($turnstileToken, Utils::getIpAddress())) {
            return ['success' => false, 'message_key' => 'error.captcha_failed'];
        }

        $safeInput = [
            'email' => $input['email'] ?? null,
            'password' => $input['password'] ?? null
        ];
        try { return $this->authServices->login($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function login_verify_2fa($input) {
        $turnstileToken = $input['turnstile_token'] ?? null;
        if (!$this->turnstile->isValid($turnstileToken, Utils::getIpAddress())) {
            return ['success' => false, 'message_key' => 'error.captcha_failed'];
        }

        $safeInput = [
            'code' => $input['code'] ?? null,
            'temp_auth_token' => $input['temp_auth_token'] ?? null
        ];
        try { return $this->authServices->loginVerify2FA($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function cancel_account_deletion($input) {
        $safeInput = [
            'temp_auth_token' => $input['temp_auth_token'] ?? null,
            'remember_device' => isset($input['remember_device']) ? filter_var($input['remember_device'], FILTER_VALIDATE_BOOLEAN) : false
        ];
        try { return $this->authServices->cancelAccountDeletion($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function switch_account($input) {
        $safeInput = [
            'user_id' => $input['user_id'] ?? null
        ];
        try { return $this->authServices->switchAccount($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function logout() {
        try { return $this->authServices->logout(); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function logout_all() {
        try { return $this->authServices->logoutAll(); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function forgot_password($input) {
        $turnstileToken = $input['turnstile_token'] ?? null;
        if (!$this->turnstile->isValid($turnstileToken, Utils::getIpAddress())) {
            return ['success' => false, 'message_key' => 'error.captcha_failed'];
        }

        $safeInput = [
            'email' => $input['email'] ?? null
        ];
        try { return $this->authServices->forgotPassword($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }

    public function reset_password($input) {
        $turnstileToken = $input['turnstile_token'] ?? null;
        if (!$this->turnstile->isValid($turnstileToken, Utils::getIpAddress())) {
            return ['success' => false, 'message_key' => 'error.captcha_failed'];
        }

        $safeInput = [
            'token' => $input['token'] ?? null,
            'password' => $input['password'] ?? null
        ];
        try { return $this->authServices->resetPassword($safeInput); }
        catch (\Throwable $e) { return $this->handleException($e, __FUNCTION__); }
    }
}
?>