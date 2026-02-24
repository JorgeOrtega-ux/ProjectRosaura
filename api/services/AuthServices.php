<?php
// api/services/AuthServices.php

namespace App\Api\Services;

use App\Core\Utils;
use App\Core\Mailer; 
use App\Core\GoogleAuthenticator;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Interfaces\UserPrefsManagerInterface;
use PDO;

class AuthServices {
    private $pdo;
    private $rateLimiter;
    private $prefsManager;

    // Recibimos las herramientas vía Constructor usando Interfaces
    public function __construct(PDO $pdo, RateLimiterInterface $rateLimiter, UserPrefsManagerInterface $prefsManager) {
        $this->pdo = $pdo;
        $this->rateLimiter = $rateLimiter;
        $this->prefsManager = $prefsManager;
    }

    public function isCurrentDeviceValid() {
        if (!isset($_SESSION['user_id']) || !isset($_COOKIE['remember_token'])) return false;
        $parts = explode(':', $_COOKIE['remember_token']);
        if (count($parts) !== 2) return false;
        $selector = $parts[0];
        $stmt = $this->pdo->prepare("SELECT t.id FROM auth_tokens t JOIN users u ON t.user_id = u.id WHERE t.selector = ? AND t.user_id = ? AND t.expires_at > NOW() AND u.user_status = 'active'");
        $stmt->execute([$selector, $_SESSION['user_id']]);
        return $stmt->rowCount() > 0;
    }

    public function createRememberToken($userId) {
        $selector = bin2hex(random_bytes(16));
        $validator = bin2hex(random_bytes(32));
        $hashedValidator = hash('sha256', $validator);
        $expiresAt = date('Y-m-d H:i:s', time() + (86400 * 30));
        $userAgent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'Desconocido', 0, 255);
        $ipAddress = substr(Utils::getIpAddress(), 0, 45);
        $stmt = $this->pdo->prepare("INSERT INTO auth_tokens (user_id, selector, hashed_validator, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $selector, $hashedValidator, $expiresAt, $userAgent, $ipAddress]);
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
                $stmt = $this->pdo->prepare("DELETE FROM auth_tokens WHERE selector = ?");
                $stmt->execute([$parts[0]]);
            }
            setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => '/ProjectRosaura/', 'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', 'httponly' => true, 'samesite' => 'Strict']);
            unset($_COOKIE['remember_token']);
        }
    }

    public function autoLogin() {
        if (isset($_SESSION['user_id']) || empty($_COOKIE['remember_token'])) return false;
        $parts = explode(':', $_COOKIE['remember_token']);
        if (count($parts) !== 2) { $this->clearRememberToken(); return false; }
        list($selector, $validator) = $parts;
        $stmt = $this->pdo->prepare("SELECT * FROM auth_tokens WHERE selector = ? AND expires_at > NOW()");
        $stmt->execute([$selector]);
        $token = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($token) {
            if (hash_equals($token['hashed_validator'], hash('sha256', $validator))) {
                $stmtUser = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
                $stmtUser->execute([$token['user_id']]);
                $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

                if ($user) {
                    if ($user['user_status'] !== 'active') {
                        $stmtDelAll = $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = ?");
                        $stmtDelAll->execute([$user['id']]);
                        $this->clearRememberToken();
                        return false;
                    }
                    session_regenerate_id(true);
                    
                    // USO DEL PREF MANAGER
                    $userPrefs = $this->prefsManager->ensureDefaultPreferences($user['id']);
                    
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
                    $this->createRememberToken($user['id']);
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
        $email = trim($data['email'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($email) || empty($password)) return ['success' => false, 'message' => 'El correo y la contraseña son obligatorios.'];
        $eVal = Utils::validateEmailFormat($email); if (!$eVal['valid']) return ['success' => false, 'message' => $eVal['message']];
        $pVal = Utils::validatePasswordFormat($password); if (!$pVal['valid']) return ['success' => false, 'message' => $pVal['message']];
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?"); $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) return ['success' => false, 'message' => 'El correo electrónico ya está registrado.'];
        $_SESSION['reg_email'] = $email; $_SESSION['reg_password'] = $password;
        return ['success' => true, 'message' => 'Paso 1 completado.'];
    }

    public function registerStep2($data) {
        $username = trim($data['username'] ?? '');
        if (empty($username)) return ['success' => false, 'message' => 'El nombre de usuario es obligatorio.'];
        if (strlen($username) < 3 || strlen($username) > 32) return ['success' => false, 'message' => 'El nombre de usuario debe tener entre 3 y 32 caracteres.'];
        $stmtUser = $this->pdo->prepare("SELECT id FROM users WHERE username = ?"); $stmtUser->execute([$username]);
        if ($stmtUser->rowCount() > 0) return ['success' => false, 'message' => 'Este nombre de usuario ya está en uso.'];
        if (empty($_SESSION['reg_email']) || empty($_SESSION['reg_password'])) return ['success' => false, 'message' => 'Faltan datos. Por favor vuelve atrás.'];

        $code = Utils::generateNumericCode(12);
        $payload = json_encode(['email' => $_SESSION['reg_email'], 'password' => $_SESSION['reg_password'], 'username' => $username]);
        $identifier = $_SESSION['reg_email'];
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes')); 

        $stmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'account_activation', ?, ?, ?)");
        if ($stmt->execute([$identifier, $code, $payload, $expiresAt])) {
            $_SESSION['reg_username'] = $username;
            $mailer = new Mailer();
            if ($mailer->sendVerificationCode($identifier, $username, $code)) return ['success' => true, 'message' => 'Paso 2 completado. Código enviado.'];
            else return ['success' => false, 'message' => 'Error de red al enviar el correo. Intenta de nuevo.'];
        }
        return ['success' => false, 'message' => 'Error al guardar el código.'];
    }

    public function registerVerify($data) {
        $code = str_replace('-', '', trim($data['code'] ?? ''));
        if (empty($code)) return ['success' => false, 'message' => 'El código es obligatorio.'];
        if (empty($_SESSION['reg_email'])) return ['success' => false, 'message' => 'Sesión expirada. Inicia nuevamente.'];
        $identifier = $_SESSION['reg_email'];

        $stmt = $this->pdo->prepare("SELECT * FROM verification_codes WHERE identifier = ? AND code_type = 'account_activation' ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$identifier]);
        $verification = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$verification) return ['success' => false, 'message' => 'No se encontró un código.'];
        if ($verification['code'] !== $code) return ['success' => false, 'message' => 'El código es incorrecto.'];
        if (strtotime($verification['expires_at']) < time()) return ['success' => false, 'message' => 'El código ha expirado.'];

        $payload = json_decode($verification['payload'], true);
        $uuid = Utils::generateUUID();
        $profilePic = Utils::generateProfilePicture($payload['username'], $uuid);
        if (!$profilePic) return ['success' => false, 'message' => 'Error al generar la foto de perfil.'];

        $stmtUser = $this->pdo->prepare("INSERT INTO users (uuid, username, email, password, role, user_status, profile_picture) VALUES (?, ?, ?, ?, 'user', 'active', ?)");
        if ($stmtUser->execute([$uuid, $payload['username'], $payload['email'], password_hash($payload['password'], PASSWORD_BCRYPT), $profilePic])) {
            $userId = $this->pdo->lastInsertId();
            
            // USO DEL PREF MANAGER
            $userPrefs = $this->prefsManager->ensureDefaultPreferences($userId);

            session_regenerate_id(true);
            $_SESSION['user_id'] = $userId;
            $_SESSION['user_uuid'] = $uuid;
            $_SESSION['user_name'] = $payload['username'];
            $_SESSION['user_email'] = $payload['email'];
            $_SESSION['user_role'] = 'user';
            $_SESSION['user_pic'] = $profilePic;
            $_SESSION['user_prefs'] = $userPrefs;
            $_SESSION['user_2fa'] = 0;

            $this->createRememberToken($userId);
            unset($_SESSION['reg_email'], $_SESSION['reg_password'], $_SESSION['reg_username']);
            $delStmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE id = ?"); $delStmt->execute([$verification['id']]);

            return ['success' => true, 'message' => 'Cuenta creada con éxito.'];
        }
        return ['success' => false, 'message' => 'Error al crear la cuenta.'];
    }

    public function login($data) {
        $email = trim($data['email'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($email) || empty($password)) return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];

        // USO DEL RATE LIMITER INYECTADO
        $rateCheck = $this->rateLimiter->check('login', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?"); $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $this->rateLimiter->clear('login');
            if ($user['user_status'] === 'deleted') return ['success' => false, 'message' => 'Cuenta eliminada.'];
            if ($user['user_status'] === 'suspended') return ['success' => false, 'message' => 'Cuenta suspendida.'];
            if (!empty($user['two_factor_enabled'])) {
                $_SESSION['pending_2fa_user_id'] = $user['id'];
                return ['success' => true, 'requires_2fa' => true, 'message' => 'Se requiere código 2FA.'];
            }

            session_regenerate_id(true);
            $userPrefs = $this->prefsManager->ensureDefaultPreferences($user['id']);

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
        $this->rateLimiter->record('login', 5, 15);
        return ['success' => false, 'message' => 'Credenciales incorrectas.'];
    }

    public function loginVerify2FA($data) {
        $code = trim($data['code'] ?? '');
        if (empty($code)) return ['success' => false, 'message' => 'El código es obligatorio.'];
        if (empty($_SESSION['pending_2fa_user_id'])) return ['success' => false, 'message' => 'Sesión expirada.'];

        $userId = $_SESSION['pending_2fa_user_id'];
        $rateCheck = $this->rateLimiter->check('login_2fa', 5, 15);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ? AND user_status = 'active'");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || empty($user['two_factor_enabled'])) {
            $this->rateLimiter->record('login_2fa', 5, 15);
            return ['success' => false, 'message' => 'Error de validación.'];
        }

        $isValid = false;
        if (strlen($code) === 8) {
            $codes = json_decode($user['two_factor_recovery_codes'], true) ?: [];
            $index = array_search($code, $codes);
            if ($index !== false) {
                unset($codes[$index]);
                $stmtUpdate = $this->pdo->prepare("UPDATE users SET two_factor_recovery_codes = ? WHERE id = ?");
                $stmtUpdate->execute([json_encode(array_values($codes)), $userId]);
                $isValid = true;
            }
        } else {
            $ga = new GoogleAuthenticator();
            $isValid = $ga->verifyCode($user['two_factor_secret'], $code, 2);
        }

        if ($isValid) {
            $this->rateLimiter->clear('login_2fa');
            session_regenerate_id(true);

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_uuid'] = $user['uuid'];
            $_SESSION['user_name'] = $user['username'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['user_pic'] = $user['profile_picture'];
            $_SESSION['user_prefs'] = $this->prefsManager->ensureDefaultPreferences($user['id']);
            $_SESSION['user_2fa'] = 1;

            unset($_SESSION['pending_2fa_user_id']);
            $this->createRememberToken($user['id']);
            return ['success' => true, 'message' => 'Inicio de sesión exitoso.'];
        }

        $this->rateLimiter->record('login_2fa', 5, 15);
        return ['success' => false, 'message' => 'El código es incorrecto.'];
    }

    public function logout() {
        $this->clearRememberToken();
        session_unset(); session_destroy();
        return ['success' => true, 'message' => 'Sesión cerrada.'];
    }

    public function forgotPassword($data) {
        $email = trim($data['email'] ?? '');
        if (empty($email)) return ['success' => false, 'message' => 'El correo es obligatorio.'];
        $rateCheck = $this->rateLimiter->check('forgot_password', 3, 30);
        if (!$rateCheck['allowed']) return ['success' => false, 'message' => $rateCheck['message']];

        $stmt = $this->pdo->prepare("SELECT username, user_status FROM users WHERE email = ?"); $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || $user['user_status'] !== 'active') {
            $this->rateLimiter->record('forgot_password', 3, 30);
            return ['success' => false, 'message' => 'Cuenta no existe o está inactiva.'];
        }

        $token = bin2hex(random_bytes(32)); 
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $payload = json_encode(['email' => $email]);

        $this->pdo->prepare("DELETE FROM verification_codes WHERE identifier = ? AND code_type = 'password_reset'")->execute([$email]);
        $insertStmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'password_reset', ?, ?, ?)");
        
        if ($insertStmt->execute([$email, $token, $payload, $expiresAt])) {
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $resetLink = $protocol . $_SERVER['HTTP_HOST'] . "/ProjectRosaura/reset-password?token=" . $token;
            $mailer = new Mailer();
            if ($mailer->sendPasswordResetLink($email, $user['username'], $resetLink)) {
                $this->rateLimiter->record('forgot_password', 3, 30);
                return ['success' => true, 'message' => 'Se ha enviado un correo con las instrucciones.'];
            }
        }
        return ['success' => false, 'message' => 'Error interno al procesar la solicitud.'];
    }

    public function resetPassword($data) {
        $token = trim($data['token'] ?? ''); $password = trim($data['password'] ?? '');
        if (empty($token) || empty($password)) return ['success' => false, 'message' => 'Campos obligatorios.'];
        $passValidation = Utils::validatePasswordFormat($password);
        if (!$passValidation['valid']) return ['success' => false, 'message' => $passValidation['message']];

        $stmt = $this->pdo->prepare("SELECT * FROM verification_codes WHERE code = ? AND code_type = 'password_reset' AND expires_at > NOW()");
        $stmt->execute([$token]);
        $verification = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$verification) return ['success' => false, 'message' => 'El token es inválido o expiró.'];

        $email = $verification['identifier'];
        $updateStmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        if ($updateStmt->execute([password_hash($password, PASSWORD_BCRYPT), $email])) {
            $this->pdo->prepare("DELETE FROM auth_tokens WHERE user_id = (SELECT id FROM users WHERE email = ?)")->execute([$email]);
            $this->pdo->prepare("DELETE FROM verification_codes WHERE identifier = ? AND code_type = 'password_reset'")->execute([$email]);
            return ['success' => true, 'message' => 'Contraseña actualizada.'];
        }
        return ['success' => false, 'message' => 'Error al actualizar.'];
    }
}
?>