<?php
// includes/core/Utils.php

namespace App\Core;

class Utils {
    
    /**
     * Genera un UUID v4 de forma aleatoria.
     * @return string
     */
    public static function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Genera una foto de perfil predeterminada usando la inicial del nombre.
     * @param string $username Nombre de usuario para extraer la inicial.
     * @param string $uuid Identificador para nombrar el archivo físico.
     * @return string|false Ruta relativa de la imagen creada o false si hay error.
     */
    public static function generateProfilePicture($username, $uuid) {
        $initial = mb_substr($username, 0, 1, "UTF-8");
        
        $allowedColors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];
        $randomColor = $allowedColors[array_rand($allowedColors)];
        
        $url = "https://ui-avatars.com/api/?name=" . urlencode($initial) . "&background=" . $randomColor . "&color=fff&size=512&font-size=0.5";
        
        $imageContent = @file_get_contents($url);
        
        if ($imageContent === false) {
            return false;
        }

        $storageDir = __DIR__ . '/../../public/storage/profilePictures/default/';
        
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0777, true);
        }

        $fileName = $uuid . '.png';
        $filePath = $storageDir . $fileName;

        file_put_contents($filePath, $imageContent);

        return 'public/storage/profilePictures/default/' . $fileName;
    }

    /**
     * Genera un token CSRF único para la sesión actual y lo almacena.
     * @return string
     */
    public static function generateCSRFToken() {
        if (empty($_SESSION['csrf_token'])) {
            // Genera una cadena aleatoria criptográficamente segura
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    /**
     * Valida si un token proporcionado coincide con el de la sesión.
     * @param string $token
     * @return bool
     */
    public static function validateCSRFToken($token) {
        if (empty($_SESSION['csrf_token']) || empty($token)) {
            return false;
        }
        // hash_equals previene ataques de sincronización (timing attacks)
        return hash_equals($_SESSION['csrf_token'], $token);
    }
}
?>