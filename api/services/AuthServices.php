<?php
// api/services/AuthServices.php

namespace App\Api\Services;

use App\Core\Helpers\Utils;
use App\Core\Mail\Mailer; 
use App\Core\Security\GoogleAuthenticator;
use App\Core\System\Logger;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Interfaces\TokenRepositoryInterface;
use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface; 

class AuthServices {
    private $rateLimiter;
    private $prefsManager;
    private $userRepository;
    private $sessionManager;
    private $tokenRepository;
    private $verificationCodeRepository;
    private $config; 

    public function __construct(
        RateLimiterInterface $rateLimiter, 
        UserPrefsManagerInterface $prefsManager,
        UserRepositoryInterface $userRepository,
        SessionManagerInterface $sessionManager,
        TokenRepositoryInterface $tokenRepository,
        VerificationCodeRepositoryInterface $verificationCodeRepository,
        ServerConfigRepositoryInterface $configRepository
    ) {
        $this->rateLimiter = $rateLimiter;
        $this->prefsManager = $prefsManager;
        $this->userRepository = $userRepository;
        $this->sessionManager = $sessionManager;
        $this->tokenRepository = $tokenRepository;
        $this->verificationCodeRepository = $verificationCodeRepository;
        $this->config = $configRepository->getConfig(); 
    }

    public function isCurrentDeviceValid() {
        if (!$this->sessionManager->has('user_id') || !isset($_COOKIE['remember_token'])) return false;
        
        $parts = explode(':', $_COOKIE['remember_token']);
        if (count($parts) !== 2) return false;
        
        $selector = $parts[0];
        $token = $this->tokenRepository->findValidTokenBySelectorAndUserId($selector, $this->sessionManager->get('user_id'));
        return $token !== null;
    }

    public function createRememberToken($userId) {
        $selector = bin2hex(random_bytes(16));
        $validator = bin2hex(random_bytes(32));
        $hashedValidator = hash('sha256', $validator);
        
        $days = $this->config['remember_me_days'] ?? 30;
        $expiresAt = date('Y-m-d H:i:s', time() + (86400 * $days));
        
        $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Desconocido', 0, 255);
        $ipAddress = substr(Utils::getIpAddress(), 0, 45);
        
        $this->tokenRepository->createToken($userId, $selector, $hashedValidator, $expiresAt, $userAgent, $ipAddress);
        
        $cookieValue = $selector . ':' . $validator;
        setcookie('remember_token', $cookieValue, [
            'expires' => time() + (86400 * $days),
            'path' => APP_URL ?: '/',
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
    }

    public function clearRememberToken() {
        if (isset($_COOKIE['remember_token'])) {
            $parts = explode(':', $_COOKIE['remember_token']);
            if (count($parts) === 2) {
                $this->tokenRepository->deleteBySelector($parts[0]);
            }
            setcookie('remember_token', '', [
                'expires' => time() - 3600, 
                'path' => APP_URL ?: '/', 
                'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', 
                'httponly' => true, 
                'samesite' => 'Strict'
            ]);
            unset($_COOKIE['remember_token']);
        }
    }

    public function autoLogin() {
        if ($this->sessionManager->has('user_id') || empty($_COOKIE['remember_token'])) return false;
        
        $parts = explode(':', $_COOKIE['remember_token']);
        if (count($parts) !== 2) { $this->clearRememberToken(); return false; }
        
        list($selector, $validator) = $parts;
        $token = $this->tokenRepository->findValidTokenBySelector($selector);

        if ($token) {
            if (hash_equals($token['hashed_validator'], hash('sha256', $validator))) {
                
                $user = $this->userRepository->findById($token['user_id']);

                if ($user) {
                    if ($user['user_status'] === 'deleted') {
                        Logger::security("Intento de autologin en cuenta eliminada.", 'warning', ['user_id' => $user['id'], 'ip' => Utils::getIpAddress()]);
                        $this->tokenRepository->deleteAllByUserId($user['id']);
                        $this->clearRememberToken();
                        return false;
                    }

                    if (isset($user['is_suspended']) && $user['is_suspended'] == 1) {
                        if ($user['suspension_type'] === 'temporary' && $user['suspension_end_date'] && strtotime($user['suspension_end_date']) <= time()) {
                            $this->userRepository->liftSuspension($user['id']);
                            $user['is_suspended'] = 0;
                        } else {
                            Logger::security("Intento de autologin en cuenta suspendida.", 'warning', ['user_id' => $user['id'], 'ip' => Utils::getIpAddress()]);
                            $this->tokenRepository->deleteAllByUserId($user['id']);
                            $this->clearRememberToken();
                            return false;
                        }
                    }
                    
                    $this->sessionManager->regenerate(true);
                    $userPrefs = $this->prefsManager->ensureDefaultPreferences($user['id']);
                    
                    $this->sessionManager->set('user_id', $user['id']);
                    $this->sessionManager->set('user_uuid', $user['uuid']);
                    $this->sessionManager->set('user_name', $user['username']);
                    $this->sessionManager->set('user_email', $user['email']);
                    $this->sessionManager->set('user_role', $user['role']);
                    $this->sessionManager->set('user_pic', $user['profile_picture']);
                    $this->sessionManager->set('user_identifier', $user['channel_identifier']); // Guardamos en sesión
                    $this->sessionManager->set('user_prefs', $userPrefs);
                    $this->sessionManager->set('user_2fa', $user['two_factor_enabled'] ?? 0);

                    $this->tokenRepository->deleteById($token['id']);
                    $this->createRememberToken($user['id']);
                    
                    Logger::security("Autologin exitoso", 'info', ['user_id' => $user['id'], 'ip' => Utils::getIpAddress()]);
                    return true;
                }
            } else {
                Logger::security("Manipulación de cookie de autologin detectada", 'warning', ['user_id' => $token['user_id'], 'ip' => Utils::getIpAddress()]);
                $this->tokenRepository->deleteAllByUserId($token['user_id']);
            }
        }
        $this->clearRememberToken();
        return false;
    }

    public function registerStep1($data) {
        $email = trim($data['email'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($email) || empty($password)) return ['success' => false, 'message' => 'El correo y la contraseña son obligatorios.'];
        
        $eVal = Utils::validateEmailFormat($email); 
        if (!$eVal['valid']) return ['success' => false, 'message' => $eVal['message']];
        
        $pVal = Utils::validatePasswordFormat($password, $this->config['min_password_length'], $this->config['max_password_length']); 
        if (!$pVal['valid']) return ['success' => false, 'message' => $pVal['message']];
        
        if ($this->userRepository->findByEmail($email)) {
            Logger::security("Intento de registro con correo ya existente: {$email}", 'info', ['ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => 'El correo electrónico ya está registrado.'];
        }
        
        $this->sessionManager->set('reg_email', $email); 
        $this->sessionManager->set('reg_password', $password);
        return ['success' => true, 'message' => 'Paso 1 completado.'];
    }

    public function registerStep2($data) {
        $username = trim($data['username'] ?? '');
        if (empty($username)) return ['success' => false, 'message' => 'El nombre de usuario es obligatorio.'];
        
        $minUser = $this->config['min_username_length'];
        $maxUser = $this->config['max_username_length'];
        if (strlen($username) < $minUser || strlen($username) > $maxUser) {
            return ['success' => false, 'message' => "El nombre de usuario debe tener entre {$minUser} y {$maxUser} caracteres."];
        }
        
        if ($this->userRepository->findByUsername($username)) {
            return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso.'];
        }

        if (!$this->sessionManager->has('reg_email') || !$this->sessionManager->has('reg_password')) {
            return ['success' => false, 'message' => 'Faltan datos. Por favor vuelve atrás.'];
        }

        $code = Utils::generateNumericCode(12);
        $payload = json_encode([
            'email' => $this->sessionManager->get('reg_email'), 
            'password' => $this->sessionManager->get('reg_password'), 
            'username' => $username
        ]);
        $identifier = $this->sessionManager->get('reg_email');
        
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$codeMinutes} minutes")); 

        if ($this->verificationCodeRepository->createCode($identifier, 'account_activation', $code, $payload, $expiresAt)) {
            $this->sessionManager->set('reg_username', $username);
            
            $mailer = new Mailer();
            if ($mailer->sendVerificationCode($identifier, $username, $code)) {
                Logger::security("Código de verificación de registro enviado a: {$identifier}", 'info', ['ip' => Utils::getIpAddress()]);
                return ['success' => true, 'message' => 'Paso 2 completado. Código enviado.'];
            } else {
                Logger::security("Fallo interno al enviar correo a: {$identifier}", 'error', ['ip' => Utils::getIpAddress()]);
                return ['success' => false, 'message' => 'Error de red al enviar el correo. Intenta de nuevo.'];
            }
        }
        return ['success' => false, 'message' => 'Error al guardar el código.'];
    }

    public function registerResendCode() {
        if (!$this->sessionManager->has('reg_email') || !$this->sessionManager->has('reg_username')) {
            return ['success' => false, 'message' => 'Faltan datos de sesión.'];
        }
        
        $email = $this->sessionManager->get('reg_email');
        $username = $this->sessionManager->get('reg_username');
        $password = $this->sessionManager->get('reg_password');

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, 'account_activation');
        if ($lastCode && isset($lastCode['seconds_elapsed']) && $lastCode['seconds_elapsed'] < 60) {
            $timeLeft = 60 - (int)$lastCode['seconds_elapsed'];
            return ['success' => false, 'message' => "Por favor, espera {$timeLeft} segundos antes de solicitar otro código.", 'cooldown' => $timeLeft];
        }

        $code = Utils::generateNumericCode(12);
        $payload = json_encode([
            'email' => $email, 
            'password' => $password, 
            'username' => $username
        ]);
        
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$codeMinutes} minutes")); 

        $this->verificationCodeRepository->deleteByIdentifierAndType($email, 'account_activation');

        if ($this->verificationCodeRepository->createCode($email, 'account_activation', $code, $payload, $expiresAt)) {
            $mailer = new Mailer();
            if ($mailer->sendVerificationCode($email, $username, $code)) {
                Logger::security("Código de verificación de registro reenviado a: {$email}", 'info', ['ip' => Utils::getIpAddress()]);
                return ['success' => true, 'message' => 'Código reenviado correctamente.'];
            } else {
                Logger::security("Fallo interno al reenviar correo a: {$email}", 'error', ['ip' => Utils::getIpAddress()]);
                return ['success' => false, 'message' => 'Error de red al reenviar el correo. Intenta de nuevo.'];
            }
        }
        return ['success' => false, 'message' => 'Error al procesar la solicitud.'];
    }

    public function registerVerify($data) {
        $code = str_replace('-', '', trim($data['code'] ?? ''));
        if (empty($code)) return ['success' => false, 'message' => 'El código es obligatorio.'];
        
        if (!$this->sessionManager->has('reg_email')) {
            return ['success' => false, 'message' => 'Sesión expirada. Inicia nuevamente.'];
        }
        $identifier = $this->sessionManager->get('reg_email');

        $verification = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($identifier, 'account_activation');

        if (!$verification) return ['success' => false, 'message' => 'No se encontró un código o ha expirado.'];
        if ($verification['code'] !== $code) {
            Logger::security("Código incorrecto ingresado para: {$identifier}", 'warning', ['ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => 'El código es incorrecto.'];
        }

        $payload = json_decode($verification['payload'], true);
        $uuid = Utils::generateUUID();
        $profilePic = Utils::generateProfilePicture($payload['username'], $uuid);
        if (!$profilePic) return ['success' => false, 'message' => 'Error al generar la foto de perfil.'];

        // --- LÓGICA DE GENERACIÓN DE IDENTIFICADOR ---
        // 1. Sanitizar nombre de usuario (CORREGIDO)
        $baseHandle = preg_replace('/[^a-z0-9]/', '', strtolower($payload['username']));
        if (empty($baseHandle)) $baseHandle = 'user'; // Fallback por si usan solo caracteres especiales
        
        $channelIdentifier = $baseHandle;
        $counter = 1;

        // 2. Verificar colisiones y agregar sufijo si es necesario
        while ($this->userRepository->findByIdentifier($channelIdentifier)) {
            $channelIdentifier = $baseHandle . $counter;
            $counter++;
        }

        $newUserId = $this->userRepository->createUser([
            'uuid' => $uuid,
            'username' => $payload['username'],
            'email' => $payload['email'],
            'password' => password_hash($payload['password'], PASSWORD_BCRYPT),
            'profile_picture' => $profilePic,
            'channel_identifier' => $channelIdentifier // Se guarda el identificador único
        ]);

        if ($newUserId > 0) {
            $userPrefs = $this->prefsManager->ensureDefaultPreferences($newUserId);

            $this->sessionManager->regenerate(true);
            $this->sessionManager->set('user_id', $newUserId);
            $this->sessionManager->set('user_uuid', $uuid);
            $this->sessionManager->set('user_name', $payload['username']);
            $this->sessionManager->set('user_email', $payload['email']);
            $this->sessionManager->set('user_role', 'user');
            $this->sessionManager->set('user_pic', $profilePic);
            $this->sessionManager->set('user_identifier', $channelIdentifier);
            $this->sessionManager->set('user_prefs', $userPrefs);
            $this->sessionManager->set('user_2fa', 0);

            $this->createRememberToken($newUserId);
            
            $this->sessionManager->remove('reg_email');
            $this->sessionManager->remove('reg_password');
            $this->sessionManager->remove('reg_username');
            
            $this->verificationCodeRepository->deleteById($verification['id']);

            Logger::security("Nueva cuenta registrada con identificador @{$channelIdentifier}", 'info', ['user_id' => $newUserId, 'email' => $payload['email'], 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'message' => 'Cuenta creada con éxito.'];
        }
        Logger::security("Fallo en base de datos al registrar: {$payload['email']}", 'error', ['ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Error al crear la cuenta.'];
    }

    public function login($data) {
        $email = trim($data['email'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($email) || empty($password)) return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];

        $attempts = $this->config['login_rate_limit_attempts'];
        $minutes = $this->config['login_rate_limit_minutes'];
        $rateCheck = $this->rateLimiter->check('login', $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            Logger::security("Límite de tasa excedido en login para: {$email}", 'warning', ['ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $user = $this->userRepository->findByEmail($email);

        if ($user && password_verify($password, $user['password'])) {
            $this->rateLimiter->clear('login');
            
            if ($user['user_status'] === 'deleted') return ['success' => false, 'status' => 'deleted', 'message' => 'Cuenta eliminada.'];
            
            if (isset($user['is_suspended']) && $user['is_suspended'] == 1) {
                if ($user['suspension_type'] === 'temporary' && $user['suspension_end_date'] && strtotime($user['suspension_end_date']) <= time()) {
                    $this->userRepository->liftSuspension($user['id']);
                    $user['is_suspended'] = 0;
                } else {
                    return ['success' => false, 'status' => 'suspended', 'message' => 'Cuenta suspendida.'];
                }
            }
            
            if (!empty($user['two_factor_enabled'])) {
                $this->sessionManager->set('pending_2fa_user_id', $user['id']);
                Logger::security("Login requiere 2FA", 'info', ['user_id' => $user['id'], 'ip' => Utils::getIpAddress()]);
                return ['success' => true, 'requires_2fa' => true, 'message' => 'Se requiere código 2FA.'];
            }

            $this->sessionManager->regenerate(true);
            $userPrefs = $this->prefsManager->ensureDefaultPreferences($user['id']);

            $this->sessionManager->set('user_id', $user['id']);
            $this->sessionManager->set('user_uuid', $user['uuid']);
            $this->sessionManager->set('user_name', $user['username']);
            $this->sessionManager->set('user_email', $user['email']);
            $this->sessionManager->set('user_role', $user['role']);
            $this->sessionManager->set('user_pic', $user['profile_picture']);
            $this->sessionManager->set('user_identifier', $user['channel_identifier']);
            $this->sessionManager->set('user_prefs', $userPrefs);
            $this->sessionManager->set('user_2fa', $user['two_factor_enabled'] ?? 0);

            $this->createRememberToken($user['id']);
            Logger::security("Inicio de sesión exitoso", 'info', ['user_id' => $user['id'], 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'requires_2fa' => false, 'message' => 'Inicio de sesión exitoso.'];
        }
        
        $this->rateLimiter->record('login', $attempts, $minutes);
        Logger::security("Credenciales incorrectas en login para: {$email}", 'warning', ['ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'Credenciales incorrectas.'];
    }

    public function loginVerify2FA($data) {
        $code = trim($data['code'] ?? '');
        if (empty($code)) return ['success' => false, 'message' => 'El código es obligatorio.'];
        if (!$this->sessionManager->has('pending_2fa_user_id')) return ['success' => false, 'message' => 'Sesión expirada.'];

        $userId = $this->sessionManager->get('pending_2fa_user_id');
        
        $attempts = $this->config['login_rate_limit_attempts'];
        $minutes = $this->config['login_rate_limit_minutes'];
        $rateCheck = $this->rateLimiter->check('login_2fa', $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            Logger::security("Límite de tasa excedido en 2FA", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $user = $this->userRepository->findById($userId);

        if (!$user || empty($user['two_factor_enabled']) || $user['user_status'] === 'deleted' || (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            $this->rateLimiter->record('login_2fa', $attempts, $minutes);
            return ['success' => false, 'message' => 'Error de validación de estado de cuenta.'];
        }

        $isValid = false;
        if (strlen($code) === 8) {
            $codes = json_decode($user['two_factor_recovery_codes'], true) ?: [];
            $index = array_search($code, $codes);
            if ($index !== false) {
                unset($codes[$index]);
                $this->userRepository->updateRecoveryCodes($userId, json_encode(array_values($codes)));
                $isValid = true;
                Logger::security("Login exitoso usando código recuperación 2FA", 'info', ['user_id' => $userId]);
            }
        } else {
            $ga = new GoogleAuthenticator();
            $isValid = $ga->verifyCode($user['two_factor_secret'], $code, 2);
        }

        if ($isValid) {
            $this->rateLimiter->clear('login_2fa');
            $this->sessionManager->regenerate(true);

            $this->sessionManager->set('user_id', $user['id']);
            $this->sessionManager->set('user_uuid', $user['uuid']);
            $this->sessionManager->set('user_name', $user['username']);
            $this->sessionManager->set('user_email', $user['email']);
            $this->sessionManager->set('user_role', $user['role']);
            $this->sessionManager->set('user_pic', $user['profile_picture']);
            $this->sessionManager->set('user_identifier', $user['channel_identifier']);
            $this->sessionManager->set('user_prefs', $this->prefsManager->ensureDefaultPreferences($user['id']));
            $this->sessionManager->set('user_2fa', 1);

            $this->sessionManager->remove('pending_2fa_user_id');
            $this->createRememberToken($user['id']);
            
            return ['success' => true, 'message' => 'Inicio de sesión exitoso.'];
        }

        $this->rateLimiter->record('login_2fa', $attempts, $minutes);
        Logger::security("Código 2FA incorrecto", 'warning', ['user_id' => $userId, 'ip' => Utils::getIpAddress()]);
        return ['success' => false, 'message' => 'El código es incorrecto.'];
    }

    public function logout() {
        if ($this->sessionManager->has('user_id')) {
            Logger::security("Cierre de sesión manual", 'info', ['user_id' => $this->sessionManager->get('user_id'), 'ip' => Utils::getIpAddress()]);
        }
        $this->clearRememberToken();
        $this->sessionManager->destroy();
        return ['success' => true, 'message' => 'Sesión cerrada.'];
    }

    public function forgotPassword($data) {
        $email = trim($data['email'] ?? '');
        if (empty($email)) return ['success' => false, 'message' => 'El correo es obligatorio.'];
        
        $attempts = $this->config['forgot_password_rate_limit_attempts'];
        $minutes = $this->config['forgot_password_rate_limit_minutes'];
        $rateCheck = $this->rateLimiter->check('forgot_password', $attempts, $minutes);
        
        if (!$rateCheck['allowed']) {
            Logger::security("Límite de tasa excedido en recuperación", 'warning', ['ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $user = $this->userRepository->findByEmail($email);

        if (!$user || $user['user_status'] === 'deleted' || (isset($user['is_suspended']) && $user['is_suspended'] == 1)) {
            $this->rateLimiter->record('forgot_password', $attempts, $minutes);
            return ['success' => false, 'message' => 'Cuenta no existe o está suspendida.'];
        }

        $lastCode = $this->verificationCodeRepository->findLatestValidByIdentifierAndType($email, 'password_reset');
        if ($lastCode && isset($lastCode['seconds_elapsed']) && $lastCode['seconds_elapsed'] < 60) {
            $timeLeft = 60 - (int)$lastCode['seconds_elapsed'];
            $this->rateLimiter->record('forgot_password', $attempts, $minutes);
            return ['success' => false, 'message' => "Por favor, espera {$timeLeft} segundos antes de solicitar otro correo.", 'cooldown' => $timeLeft];
        }

        $token = bin2hex(random_bytes(32)); 
        
        $codeMinutes = $this->config['verification_code_minutes'] ?? 15;
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$codeMinutes} minutes"));
        
        $payload = json_encode(['email' => $email]);

        $this->verificationCodeRepository->deleteByIdentifierAndType($email, 'password_reset');
        
        if ($this->verificationCodeRepository->createCode($email, 'password_reset', $token, $payload, $expiresAt)) {
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $resetLink = $protocol . $_SERVER['HTTP_HOST'] . APP_URL . "/reset-password?token=" . $token;
            $mailer = new Mailer();
            if ($mailer->sendPasswordResetLink($email, $user['username'], $resetLink)) {
                $this->rateLimiter->record('forgot_password', $attempts, $minutes);
                Logger::security("Enlace de recuperación enviado exitosamente", 'info', ['user_id' => $user['id'], 'ip' => Utils::getIpAddress()]);
                return ['success' => true, 'message' => 'Se ha enviado un correo con las instrucciones.'];
            }
        }
        return ['success' => false, 'message' => 'Error interno al procesar la solicitud.'];
    }

    public function resetPassword($data) {
        $token = trim($data['token'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($token) || empty($password)) return ['success' => false, 'message' => 'Campos obligatorios.'];
        
        $passValidation = Utils::validatePasswordFormat($password, $this->config['min_password_length'], $this->config['max_password_length']);
        if (!$passValidation['valid']) return ['success' => false, 'message' => $passValidation['message']];

        $verification = $this->verificationCodeRepository->findValidByCodeAndType($token, 'password_reset');

        if (!$verification) {
            Logger::security("Intento de uso de token expirado", 'warning', ['ip' => Utils::getIpAddress()]);
            return ['success' => false, 'message' => 'El token es inválido o expiró.'];
        }

        $email = $verification['identifier'];
        $user = $this->userRepository->findByEmail($email);
        
        if ($user && $this->userRepository->updatePassword($user['id'], password_hash($password, PASSWORD_BCRYPT))) {
            $this->tokenRepository->deleteAllByUserId($user['id']);
            $this->verificationCodeRepository->deleteByIdentifierAndType($email, 'password_reset');
            Logger::security("Contraseña restablecida", 'info', ['email' => $email, 'ip' => Utils::getIpAddress()]);
            return ['success' => true, 'message' => 'Contraseña actualizada.'];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }
}
?>