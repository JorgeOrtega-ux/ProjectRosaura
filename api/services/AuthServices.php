<?php
// api/services/AuthServices.php

namespace App\Api\Services;

use App\Core\Utils;
use App\Config\Database;
use App\Core\Mailer; 
use App\Core\GoogleAuthenticator; // IMPORTACIÓN NECESARIA
use PDO;

class AuthServices {
    private $pdo;

    public function __construct() {
        $db = new Database();
        $this->pdo = $db->getConnection();
    }

    public function createRememberToken($userId) {
        $selector = bin2hex(random_bytes(16));
        $validator = bin2hex(random_bytes(32));
        $hashedValidator = hash('sha256', $validator);
        $expiresAt = date('Y-m-d H:i:s', time() + (86400 * 30));

        $stmt = $this->pdo->prepare("INSERT INTO auth_tokens (user_id, selector, hashed_validator, expires_at) VALUES (?, ?, ?, ?)");
        $stmt->execute([$userId, $selector, $hashedValidator, $expiresAt]);

        $cookieValue = $selector . ':' . $validator;
        
        setcookie('remember_token', $cookieValue, [
            'expires' => time() + (86400 * 30),
            'path' => '/ProjectRosaura/',
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
    }

    public function clearRememberToken() {
        if (isset($_COOKIE['remember_token'])) {
            $parts = explode(':', $_COOKIE['remember_token']);
            if (count($parts) === 2) {
                $selector = $parts[0];
                $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE selector = ?");
                $stmt->execute([$selector]);
            }
            
            setcookie('remember_token', '', [
                'expires' => time() - 3600,
                'path' => '/ProjectRosaura/',
                'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
                'httponly' => true,
                'samesite' => 'Strict'
            ]);
            unset($_COOKIE['remember_token']);
        }
    }

    public function autoLogin() {
        if (isset($_SESSION['user_id']) || empty($_COOKIE['remember_token'])) {
            return false;
        }

        $parts = explode(':', $_COOKIE['remember_token']);
        if (count($parts) !== 2) {
            $this->clearRememberToken();
            return false;
        }

        list($selector, $validator) = $parts;

        $stmt = $this->pdo->prepare("SELECT * FROM auth_tokens WHERE selector = ? AND expires_at > NOW()");
        $stmt->execute([$selector]);
        $token = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($token) {
            $calcHash = hash('sha256', $validator);
            
            if (hash_equals($token['hashed_validator'], $calcHash)) {
                $userId = $token['user_id'];
                
                $stmtUser = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
                $stmtUser->execute([$userId]);
                $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

                if ($user) {
                    session_regenerate_id(true);
                    
                    $stmtPref = $this->pdo->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
                    $stmtPref->execute([$userId]);
                    $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);

                    if (!$userPrefs) {
                        $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
                        $assignedLang = Utils::getClosestLanguage($acceptLang);
                        
                        $insPref = $this->pdo->prepare("INSERT INTO user_preferences (user_id, language, open_links_new_tab, theme, extended_alerts) VALUES (?, ?, 1, 'system', 0)");
                        $insPref->execute([$userId, $assignedLang]);
                        
                        $stmtPref->execute([$userId]);
                        $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);
                    }
                    
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_uuid'] = $user['uuid'];
                    $_SESSION['user_name'] = $user['username'];
                    $_SESSION['user_email'] = $user['email'];
                    $_SESSION['user_role'] = $user['role'];
                    $_SESSION['user_pic'] = $user['profile_picture'];
                    $_SESSION['user_prefs'] = $userPrefs;
                    $_SESSION['user_2fa'] = $user['two_factor_enabled'] ?? 0;

                    $stmtDel = $this->pdo->prepare("DELETE FROM auth_tokens WHERE id = ?");
                    $stmtDel->execute([$token['id']]);
                    $this->createRememberToken($userId);

                    return true;
                }
            } else {
                $stmtDelAll = $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ?");
                $stmtDelAll->execute([$token['user_id']]);
            }
        }
        
        $this->clearRememberToken();
        return false;
    }

    public function registerStep1($data) {
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'El correo y la contraseña son obligatorios.'];
        }

        $passLen = strlen($password);
        if ($passLen < 8 || $passLen > 64) {
            return ['success' => false, 'message' => 'La contraseña debe tener entre 8 y 64 caracteres.'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'El formato del correo electrónico no es válido.'];
        }

        $emailLen = strlen($email);
        if ($emailLen < 6 || $emailLen > 254) {
            return ['success' => false, 'message' => 'El correo debe tener en total entre 6 y 254 caracteres.'];
        }

        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return ['success' => false, 'message' => 'El formato del correo electrónico es incorrecto.'];
        }

        $localPart = $parts[0];
        $domainPart = $parts[1];

        if (strlen($localPart) < 2 || strlen($localPart) > 64) {
            return ['success' => false, 'message' => 'La parte local del correo (antes de la @) debe tener entre 2 y 64 caracteres.'];
        }

        if (strlen($domainPart) < 3 || strlen($domainPart) > 255) {
            return ['success' => false, 'message' => 'El dominio del correo (después de la @) debe tener entre 3 y 255 caracteres.'];
        }

        $subdomains = explode('.', $domainPart);
        if (count($subdomains) < 2) {
            return ['success' => false, 'message' => 'El dominio del correo electrónico debe incluir una extensión válida.'];
        }

        foreach ($subdomains as $sub) {
            if (strlen($sub) < 2 || strlen($sub) > 63) {
                return ['success' => false, 'message' => 'Cada parte del dominio separada por un punto debe tener entre 2 y 63 caracteres.'];
            }
        }

        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) {
            return ['success' => false, 'message' => 'El correo electrónico ya está registrado.'];
        }

        $_SESSION['reg_email'] = $email;
        $_SESSION['reg_password'] = $password;

        return ['success' => true, 'message' => 'Paso 1 completado.'];
    }

    public function registerStep2($data) {
        $username = trim($data['username'] ?? '');

        if (empty($username)) {
            return ['success' => false, 'message' => 'El nombre de usuario es obligatorio.'];
        }

        $userLen = strlen($username);
        if ($userLen < 3 || $userLen > 32) {
            return ['success' => false, 'message' => 'El nombre de usuario debe tener entre 3 y 32 caracteres.'];
        }

        $stmtUser = $this->pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmtUser->execute([$username]);
        if ($stmtUser->rowCount() > 0) {
            return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso. Por favor, elige otro.'];
        }

        if (empty($_SESSION['reg_email']) || empty($_SESSION['reg_password'])) {
            return ['success' => false, 'message' => 'Faltan datos de la etapa 1. Por favor vuelve atrás.'];
        }

        $code = '';
        for ($i = 0; $i < 12; $i++) {
            $code .= mt_rand(0, 9);
        }

        $payload = json_encode([
            'email' => $_SESSION['reg_email'],
            'password' => $_SESSION['reg_password'],
            'username' => $username
        ]);

        $identifier = $_SESSION['reg_email'];
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes')); 

        $stmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'account_activation', ?, ?, ?)");
        
        if ($stmt->execute([$identifier, $code, $payload, $expiresAt])) {
            $_SESSION['reg_username'] = $username;
            
            $mailer = new Mailer();
            $emailSent = $mailer->sendVerificationCode($identifier, $username, $code);

            if ($emailSent) {
                return ['success' => true, 'message' => 'Paso 2 completado. Código enviado al correo.'];
            } else {
                return ['success' => false, 'message' => 'El registro avanzó, pero hubo un error de red al enviar el correo. Por favor intenta registrarte de nuevo.'];
            }
        }

        return ['success' => false, 'message' => 'Error al guardar el código de verificación.'];
    }

    public function registerVerify($data) {
        $code = trim($data['code'] ?? '');
        $code = str_replace('-', '', $code);

        if (empty($code)) {
            return ['success' => false, 'message' => 'El código de verificación es obligatorio.'];
        }

        if (empty($_SESSION['reg_email'])) {
            return ['success' => false, 'message' => 'Sesión expirada o datos incompletos. Por favor inicia nuevamente.'];
        }

        $identifier = $_SESSION['reg_email'];

        $stmt = $this->pdo->prepare("SELECT * FROM verification_codes WHERE identifier = ? AND code_type = 'account_activation' ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$identifier]);
        $verification = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$verification) {
            return ['success' => false, 'message' => 'No se encontró un código para esta solicitud.'];
        }

        if ($verification['code'] !== $code) {
            return ['success' => false, 'message' => 'El código ingresado es incorrecto.'];
        }

        if (strtotime($verification['expires_at']) < time()) {
            return ['success' => false, 'message' => 'El código de verificación ha expirado.'];
        }

        $payload = json_decode($verification['payload'], true);
        $username = $payload['username'];
        $email = $payload['email'];
        $password = $payload['password'];

        $uuid = Utils::generateUUID();
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $profilePicturePath = Utils::generateProfilePicture($username, $uuid);

        if (!$profilePicturePath) {
            return ['success' => false, 'message' => 'Error al generar la foto de perfil.'];
        }

        $stmtUser = $this->pdo->prepare("INSERT INTO users (uuid, username, email, password, role, profile_picture) VALUES (?, ?, ?, ?, 'user', ?)");
        
        if ($stmtUser->execute([$uuid, $username, $email, $hashedPassword, $profilePicturePath])) {
            $userId = $this->pdo->lastInsertId();
            
            $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
            $assignedLang = Utils::getClosestLanguage($acceptLang);
            
            $stmtPref = $this->pdo->prepare("INSERT INTO user_preferences (user_id, language, open_links_new_tab, theme, extended_alerts) VALUES (?, ?, 1, 'system', 0)");
            $stmtPref->execute([$userId, $assignedLang]);

            $stmtGetPref = $this->pdo->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
            $stmtGetPref->execute([$userId]);
            $userPrefs = $stmtGetPref->fetch(PDO::FETCH_ASSOC);

            session_regenerate_id(true);
            
            $_SESSION['user_id'] = $userId;
            $_SESSION['user_uuid'] = $uuid;
            $_SESSION['user_name'] = $username;
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = 'user';
            $_SESSION['user_pic'] = $profilePicturePath;
            $_SESSION['user_prefs'] = $userPrefs;
            $_SESSION['user_2fa'] = 0;

            $this->createRememberToken($userId);

            unset($_SESSION['reg_email']);
            unset($_SESSION['reg_password']);
            unset($_SESSION['reg_username']);

            $delStmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE id = ?");
            $delStmt->execute([$verification['id']]);

            return ['success' => true, 'message' => 'Cuenta creada y verificada con éxito.'];
        }

        return ['success' => false, 'message' => 'Error al crear la cuenta en la base de datos.'];
    }

    public function login($data) {
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
        }

        $rateCheck = $this->checkRateLimit('login', 5, 15);
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $this->clearRateLimit('login');
            
            // VERIFICACIÓN DE 2FA:
            if (!empty($user['two_factor_enabled'])) {
                $_SESSION['pending_2fa_user_id'] = $user['id'];
                return ['success' => true, 'requires_2fa' => true, 'message' => 'Se requiere código de verificación de dos factores.'];
            }

            // SI NO TIENE 2FA, PROCEDE NORMAL
            session_regenerate_id(true);

            $stmtPref = $this->pdo->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
            $stmtPref->execute([$user['id']]);
            $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);

            if (!$userPrefs) {
                $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
                $assignedLang = Utils::getClosestLanguage($acceptLang);
                
                $insPref = $this->pdo->prepare("INSERT INTO user_preferences (user_id, language, open_links_new_tab, theme, extended_alerts) VALUES (?, ?, 1, 'system', 0)");
                $insPref->execute([$user['id'], $assignedLang]);
                
                $stmtPref->execute([$user['id']]);
                $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);
            }

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_uuid'] = $user['uuid'];
            $_SESSION['user_name'] = $user['username'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['user_pic'] = $user['profile_picture'];
            $_SESSION['user_prefs'] = $userPrefs;
            $_SESSION['user_2fa'] = $user['two_factor_enabled'] ?? 0;

            $this->createRememberToken($user['id']);

            return ['success' => true, 'requires_2fa' => false, 'message' => 'Inicio de sesión exitoso.'];
        }

        $this->recordAttempt('login', 5, 15);

        return ['success' => false, 'message' => 'Credenciales incorrectas.'];
    }

    public function loginVerify2FA($data) {
        $code = trim($data['code'] ?? '');
        
        if (empty($code)) {
            return ['success' => false, 'message' => 'El código de seguridad es obligatorio.'];
        }

        if (empty($_SESSION['pending_2fa_user_id'])) {
            return ['success' => false, 'message' => 'Sesión expirada o inválida. Por favor inicia sesión nuevamente.'];
        }

        $userId = $_SESSION['pending_2fa_user_id'];

        $rateCheck = $this->checkRateLimit('login_2fa', 5, 15);
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || empty($user['two_factor_enabled'])) {
            $this->recordAttempt('login_2fa', 5, 15);
            return ['success' => false, 'message' => 'Error de validación del usuario.'];
        }

        $isValid = false;
        
        // Comprobar si es código de app o código de recuperación (los de rec. tienen 8 caracteres)
        if (strlen($code) === 8) {
            $codes = json_decode($user['two_factor_recovery_codes'], true) ?: [];
            $index = array_search($code, $codes);
            if ($index !== false) {
                unset($codes[$index]);
                $codesJson = json_encode(array_values($codes));
                $stmtUpdate = $this->pdo->prepare("UPDATE users SET two_factor_recovery_codes = ? WHERE id = ?");
                $stmtUpdate->execute([$codesJson, $userId]);
                $isValid = true;
            }
        } else {
            $ga = new GoogleAuthenticator();
            $isValid = $ga->verifyCode($user['two_factor_secret'], $code, 2);
        }

        if ($isValid) {
            $this->clearRateLimit('login_2fa');
            session_regenerate_id(true);

            $stmtPref = $this->pdo->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
            $stmtPref->execute([$user['id']]);
            $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);

            if (!$userPrefs) {
                $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
                $assignedLang = Utils::getClosestLanguage($acceptLang);
                
                $insPref = $this->pdo->prepare("INSERT INTO user_preferences (user_id, language, open_links_new_tab, theme, extended_alerts) VALUES (?, ?, 1, 'system', 0)");
                $insPref->execute([$user['id'], $assignedLang]);
                
                $stmtPref->execute([$user['id']]);
                $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);
            }

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_uuid'] = $user['uuid'];
            $_SESSION['user_name'] = $user['username'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['user_pic'] = $user['profile_picture'];
            $_SESSION['user_prefs'] = $userPrefs;
            $_SESSION['user_2fa'] = 1;

            unset($_SESSION['pending_2fa_user_id']);

            $this->createRememberToken($user['id']);

            return ['success' => true, 'message' => 'Inicio de sesión exitoso.'];
        }

        $this->recordAttempt('login_2fa', 5, 15);
        return ['success' => false, 'message' => 'El código ingresado es incorrecto.'];
    }

    public function logout() {
        $this->clearRememberToken();
        session_unset();
        session_destroy();
        return ['success' => true, 'message' => 'Sesión cerrada.'];
    }

    public function forgotPassword($data) {
        $email = trim($data['email'] ?? '');

        if (empty($email)) {
            return ['success' => false, 'message' => 'El correo es obligatorio.'];
        }

        $rateCheck = $this->checkRateLimit('forgot_password', 3, 30);
        if (!$rateCheck['allowed']) {
            return ['success' => false, 'message' => $rateCheck['message']];
        }

        $stmt = $this->pdo->prepare("SELECT username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $this->recordAttempt('forgot_password', 3, 30);
            return ['success' => false, 'message' => 'El correo ingresado no existe.'];
        }

        $token = bin2hex(random_bytes(32)); 
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $payload = json_encode(['email' => $email]);

        $delStmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE identifier = ? AND code_type = 'password_reset'");
        $delStmt->execute([$email]);

        $insertStmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'password_reset', ?, ?, ?)");
        
        if ($insertStmt->execute([$email, $token, $payload, $expiresAt])) {
            
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $host = $_SERVER['HTTP_HOST'];
            $resetLink = $protocol . $host . "/ProjectRosaura/reset-password?token=" . $token;

            $mailer = new Mailer();
            $emailSent = $mailer->sendPasswordResetLink($email, $user['username'], $resetLink);

            if ($emailSent) {
                $this->recordAttempt('forgot_password', 3, 30);
                return ['success' => true, 'message' => 'Se ha enviado un correo con las instrucciones.'];
            } else {
                return ['success' => false, 'message' => 'Error al enviar el correo electrónico. Inténtalo más tarde.'];
            }
        }

        return ['success' => false, 'message' => 'Error interno al procesar la solicitud.'];
    }

    public function resetPassword($data) {
        $token = trim($data['token'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($token) || empty($password)) {
            return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
        }

        $passLen = strlen($password);
        if ($passLen < 8 || $passLen > 64) {
            return ['success' => false, 'message' => 'La contraseña debe tener entre 8 y 64 caracteres.'];
        }

        $stmt = $this->pdo->prepare("SELECT * FROM verification_codes WHERE code = ? AND code_type = 'password_reset' AND expires_at > NOW()");
        $stmt->execute([$token]);
        $verification = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$verification) {
            return ['success' => false, 'message' => 'El token es inválido o ha expirado.'];
        }

        $email = $verification['identifier'];
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        $updateStmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        if ($updateStmt->execute([$hashedPassword, $email])) {
            
            $stmtDelAll = $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = (SELECT id FROM users WHERE email = ?)");
            $stmtDelAll->execute([$email]);

            $delStmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE identifier = ? AND code_type = 'password_reset'");
            $delStmt->execute([$email]);

            return ['success' => true, 'message' => 'Tu contraseña ha sido actualizada exitosamente.'];
        }

        return ['success' => false, 'message' => 'Hubo un error al actualizar la contraseña.'];
    }

    private function getIpAddress() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        }
        return trim($ip);
    }

    private function checkRateLimit($action, $maxAttempts, $lockoutMinutes) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit) {
            if ($limit['blocked_until'] && strtotime($limit['blocked_until']) > time()) {
                $remainingMinutes = ceil((strtotime($limit['blocked_until']) - time()) / 60);
                return [
                    'allowed' => false, 
                    'message' => "Demasiados intentos. Por seguridad, por favor espera {$remainingMinutes} minutos e inténtalo de nuevo."
                ];
            }
        }
        return ['allowed' => true];
    }

    private function recordAttempt($action, $maxAttempts, $lockoutMinutes) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit) {
            if ($limit['blocked_until'] && strtotime($limit['blocked_until']) <= time()) {
                $attempts = 1;
                $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            } else {
                $attempts = $limit['attempts'] + 1;
                $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            }

            $updateStmt = $this->pdo->prepare("UPDATE rate_limits SET attempts = ?, blocked_until = ? WHERE ip_address = ? AND action = ?");
            $updateStmt->execute([$attempts, $blockedUntil, $ip, $action]);
        } else {
            $attempts = 1;
            $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            
            $insertStmt = $this->pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts, blocked_until) VALUES (?, ?, ?, ?)");
            $insertStmt->execute([$ip, $action, $attempts, $blockedUntil]);
        }
    }

    private function clearRateLimit($action) {
        $ip = $this->getIpAddress();
        $stmt = $this->pdo->prepare("DELETE FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
    }
}
?>