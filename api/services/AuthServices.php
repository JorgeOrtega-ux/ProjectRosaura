<?php
// api/services/AuthServices.php

namespace App\Api\Services;

use App\Core\Utils;
use App\Config\Database;
use PDO;

class AuthServices {
    private $pdo;

    public function __construct() {
        // Instanciamos la clase Database centralizada
        $db = new Database();
        $this->pdo = $db->getConnection();
    }

    public function registerStep1($data) {
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'El correo y la contraseña son obligatorios.'];
        }

        // Verificar si el correo ya existe
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) {
            return ['success' => false, 'message' => 'El correo electrónico ya está registrado.'];
        }

        // Guardamos temporalmente en sesión
        $_SESSION['reg_email'] = $email;
        $_SESSION['reg_password'] = $password;

        return ['success' => true, 'message' => 'Paso 1 completado.'];
    }

    public function registerStep2($data) {
        $username = trim($data['username'] ?? '');

        if (empty($username)) {
            return ['success' => false, 'message' => 'El nombre de usuario es obligatorio.'];
        }

        if (empty($_SESSION['reg_email']) || empty($_SESSION['reg_password'])) {
            return ['success' => false, 'message' => 'Faltan datos de la etapa 1. Por favor vuelve atrás.'];
        }

        // Generar un código numérico aleatorio de 12 dígitos
        $code = '';
        for ($i = 0; $i < 12; $i++) {
            $code .= mt_rand(0, 9);
        }

        // Preparar el payload con todos los datos
        $payload = json_encode([
            'email' => $_SESSION['reg_email'],
            'password' => $_SESSION['reg_password'],
            'username' => $username
        ]);

        $identifier = $_SESSION['reg_email'];
        $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes')); // Expira en 15 mins

        $stmt = $this->pdo->prepare("INSERT INTO verification_codes (identifier, code_type, code, payload, expires_at) VALUES (?, 'account_activation', ?, ?, ?)");
        
        if ($stmt->execute([$identifier, $code, $payload, $expiresAt])) {
            $_SESSION['reg_username'] = $username;
            // NOTA: El envío por correo u otro medio queda pendiente.
            return ['success' => true, 'message' => 'Paso 2 completado.'];
        }

        return ['success' => false, 'message' => 'Error al guardar el código de verificación.'];
    }

    public function registerVerify($data) {
        $code = trim($data['code'] ?? '');

        if (empty($code)) {
            return ['success' => false, 'message' => 'El código de verificación es obligatorio.'];
        }

        if (empty($_SESSION['reg_email'])) {
            return ['success' => false, 'message' => 'Sesión expirada o datos incompletos. Por favor inicia nuevamente.'];
        }

        $identifier = $_SESSION['reg_email'];

        // Buscar el código en la BD
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

        // Si es válido, procedemos a crear la cuenta
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
            
            // Iniciar sesión automáticamente
            $_SESSION['user_id'] = $userId;
            $_SESSION['user_uuid'] = $uuid;
            $_SESSION['user_name'] = $username;
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = 'user';
            $_SESSION['user_pic'] = $profilePicturePath;

            // Limpiar variables de registro de la sesión
            unset($_SESSION['reg_email']);
            unset($_SESSION['reg_password']);
            unset($_SESSION['reg_username']);

            // Borrar el código de verificación para que no se use de nuevo
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
}
?>