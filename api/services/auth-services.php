<?php
// api/services/auth-services.php

class AuthServices {
    private $pdo;

    public function __construct() {
        // Configuración de la base de datos
        $host = 'localhost';
        $dbname = 'projectrosaura';
        $user = 'root';
        $pass = '';

        try {
            $this->pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            die(json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos.']));
        }
    }

    public function register($data) {
        $username = trim($data['username'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if (empty($username) || empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
        }

        // Verificar si el correo ya existe
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->rowCount() > 0) {
            return ['success' => false, 'message' => 'El correo electrónico ya está registrado.'];
        }

        $uuid = $this->generateUUID();
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        
        // Generar y descargar la foto de perfil en HD (512px)
        $profilePicturePath = $this->generateProfilePicture($username, $uuid);

        if (!$profilePicturePath) {
            return ['success' => false, 'message' => 'Error al generar la foto de perfil.'];
        }

        $stmt = $this->pdo->prepare("INSERT INTO users (uuid, username, email, password, role, profile_picture) VALUES (?, ?, ?, ?, 'user', ?)");
        
        if ($stmt->execute([$uuid, $username, $email, $hashedPassword, $profilePicturePath])) {
            $userId = $this->pdo->lastInsertId();
            
            // Iniciar sesión automáticamente
            $_SESSION['user_id'] = $userId;
            $_SESSION['user_uuid'] = $uuid;
            $_SESSION['user_name'] = $username;
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = 'user';
            $_SESSION['user_pic'] = $profilePicturePath;

            return ['success' => true, 'message' => 'Cuenta creada con éxito.'];
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

    private function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    private function generateProfilePicture($username, $uuid) {
        $initial = mb_substr($username, 0, 1, "UTF-8");
        
        // Colores permitidos
        $allowedColors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];
        
        // Seleccionar un color aleatorio del arreglo
        $randomColor = $allowedColors[array_rand($allowedColors)];
        
        // Construir la URL con el color de fondo elegido y texto blanco (color=fff)
        $url = "https://ui-avatars.com/api/?name=" . urlencode($initial) . "&background=" . $randomColor . "&color=fff&size=512&font-size=0.5";
        
        $imageContent = @file_get_contents($url);
        
        if ($imageContent === false) {
            return false;
        }

        // IMPORTANTE: Subimos dos niveles (api/services -> api -> raíz -> public)
        $storageDir = __DIR__ . '/../../public/storage/profilePictures/default/';
        
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0777, true);
        }

        $fileName = $uuid . '.png';
        $filePath = $storageDir . $fileName;

        file_put_contents($filePath, $imageContent);

        return 'public/storage/profilePictures/default/' . $fileName;
    }
}
?>