<?php
// api/services/AuthServices.php

namespace App\Api\Services;

use App\Core\Utils;
use App\Config\Database;
use App\Core\Mailer; 
use PDO;

class AuthServices {
    private $pdo;

    public function __construct() {
        $db = new Database();
        $this->pdo = $db->getConnection();
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
            
            $_SESSION['user_id'] = $userId;
            $_SESSION['user_uuid'] = $uuid;
            $_SESSION['user_name'] = $username;
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = 'user';
            $_SESSION['user_pic'] = $profilePicturePath;

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

        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_uuid'] = $user['uuid'];
            $_SESSION['user_name'] = $user['username'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['user_pic'] = $user['profile_picture'];

            return ['success' => true, 'message' => 'Inicio de sesión exitoso.'];
        }

        return ['success' => false, 'message' => 'Credenciales incorrectas.'];
    }

    public function logout() {
        session_unset();
        session_destroy();
        return ['success' => true, 'message' => 'Sesión cerrada.'];
    }

    public function forgotPassword($data) {
        $email = trim($data['email'] ?? '');

        if (empty($email)) {
            return ['success' => false, 'message' => 'El correo es obligatorio.'];
        }

        // Checar si el usuario existe
        $stmt = $this->pdo->prepare("SELECT username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return ['success' => false, 'message' => 'El correo ingresado no existe.'];
        }

        // Generar un token criptográficamente seguro de 64 caracteres
        $token = bin2hex(random_bytes(32)); 
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
        $payload = json_encode(['email' => $email]);

        // Evitar acumulación de tokens por spam borrando los anteriores para esta cuenta
        $delStmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE identifier = ? AND code_type = 'password_reset'");
        $delStmt->execute([$email]);

        $insertStmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'password_reset', ?, ?, ?)");
        
        if ($insertStmt->execute([$email, $token, $payload, $expiresAt])) {
            
            // Construir el enlace en base al host dinámicamente
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $host = $_SERVER['HTTP_HOST'];
            $resetLink = $protocol . $host . "/ProjectRosaura/reset-password?token=" . $token;

            // Enviar correo
            $mailer = new Mailer();
            $emailSent = $mailer->sendPasswordResetLink($email, $user['username'], $resetLink);

            if ($emailSent) {
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

        // Buscar el token
        $stmt = $this->pdo->prepare("SELECT * FROM verification_codes WHERE code = ? AND code_type = 'password_reset' AND expires_at > NOW()");
        $stmt->execute([$token]);
        $verification = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$verification) {
            return ['success' => false, 'message' => 'El token es inválido o ha expirado.'];
        }

        $email = $verification['identifier'];
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        // Actualizar contraseña
        $updateStmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        if ($updateStmt->execute([$hashedPassword, $email])) {
            
            // Eliminar token usado
            $delStmt = $this->pdo->prepare("DELETE FROM verification_codes WHERE identifier = ? AND code_type = 'password_reset'");
            $delStmt->execute([$email]);

            return ['success' => true, 'message' => 'Tu contraseña ha sido actualizada exitosamente.'];
        }

        return ['success' => false, 'message' => 'Hubo un error al actualizar la contraseña.'];
    }
}
?>