<?php
// includes/core/Utils.php

namespace App\Core;

use PDO;

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
        return hash_equals($_SESSION['csrf_token'], $token);
    }

    /**
     * Analiza el header de idioma HTTP_ACCEPT_LANGUAGE y devuelve el idioma más cercano disponible.
     * @param string $acceptLanguage
     * @return string
     */
    public static function getClosestLanguage($acceptLanguage) {
        $available = [
            'en-US', 'en-GB', 'fr-FR', 'de-DE', 'it-IT', 
            'es-419', 'es-MX', 'es-ES', 'pt-BR', 'pt-PT'
        ];
        
        if (empty($acceptLanguage)) return 'en-US';

        preg_match_all('/([a-z]{1,8}(-[a-z]{1,8})?)\s*(;\s*q\s*=\s*(1|0\.[0-9]+))?/i', $acceptLanguage, $lang_parse);
        $langs = [];
        if (count($lang_parse[1])) {
            $langs = array_combine($lang_parse[1], $lang_parse[4]);
            foreach ($langs as $lang => $val) {
                if ($val === '') $langs[$lang] = 1;
            }
            arsort($langs, SORT_NUMERIC);
        }

        foreach ($langs as $lang => $q) {
            $lang = str_replace('_', '-', $lang);
            
            foreach ($available as $avail) {
                if (strcasecmp($lang, $avail) === 0) {
                    return $avail;
                }
            }
            
            $base = strtolower(explode('-', $lang)[0]);
            if ($base === 'es') return 'es-419';
            if ($base === 'en') return 'en-US';
            if ($base === 'pt') return 'pt-BR';
            if ($base === 'fr') return 'fr-FR';
            if ($base === 'de') return 'de-DE';
            if ($base === 'it') return 'it-IT';
        }

        return 'en-US'; 
    }

    // ========================================================================================
    // --- NUEVAS FUNCIONES ESTÁTICAS DE UTILIDAD ---
    // ========================================================================================

    /**
     * Obtiene la dirección IP real del cliente.
     * @return string
     */
    public static function getIpAddress() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        }
        return trim($ip);
    }

    /**
     * Genera un código numérico aleatorio.
     * @param int $length Longitud del código.
     * @return string
     */
    public static function generateNumericCode($length = 12) {
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= mt_rand(0, 9);
        }
        return $code;
    }

    /**
     * Genera un array de códigos de recuperación alfanuméricos (usado en 2FA).
     * @param int $count Cantidad de códigos.
     * @param int $length Longitud de cada código.
     * @return array
     */
    public static function generateRecoveryCodes($count = 10, $length = 8) {
        $codes = [];
        $bytesNeeded = ceil($length / 2);
        for ($i = 0; $i < $count; $i++) {
            $codes[] = substr(bin2hex(random_bytes($bytesNeeded)), 0, $length);
        }
        return $codes;
    }

    /**
     * Valida de manera estricta el formato de un correo electrónico.
     * @param string $email
     * @return array ['valid' => bool, 'message' => string (opcional)]
     */
    public static function validateEmailFormat($email) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'message' => 'El formato del correo electrónico no es válido.'];
        }

        $emailLen = strlen($email);
        if ($emailLen < 6 || $emailLen > 254) {
            return ['valid' => false, 'message' => 'El correo debe tener en total entre 6 y 254 caracteres.'];
        }

        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return ['valid' => false, 'message' => 'El formato del correo electrónico es incorrecto.'];
        }

        $localPart = $parts[0];
        $domainPart = $parts[1];

        if (strlen($localPart) < 2 || strlen($localPart) > 64) {
            return ['valid' => false, 'message' => 'La parte local del correo debe tener entre 2 y 64 caracteres.'];
        }

        if (strlen($domainPart) < 3 || strlen($domainPart) > 255) {
            return ['valid' => false, 'message' => 'El dominio del correo debe tener entre 3 y 255 caracteres.'];
        }

        $subdomains = explode('.', $domainPart);
        if (count($subdomains) < 2) {
            return ['valid' => false, 'message' => 'El dominio del correo electrónico debe incluir una extensión válida.'];
        }

        foreach ($subdomains as $sub) {
            if (strlen($sub) < 2 || strlen($sub) > 63) {
                return ['valid' => false, 'message' => 'Cada parte del dominio separada por un punto debe tener entre 2 y 63 caracteres.'];
            }
        }

        return ['valid' => true];
    }

    /**
     * Valida la longitud y complejidad básica de una contraseña.
     * @param string $password
     * @return array ['valid' => bool, 'message' => string (opcional)]
     */
    public static function validatePasswordFormat($password) {
        $passLen = strlen($password);
        if ($passLen < 8 || $passLen > 64) {
            return ['valid' => false, 'message' => 'La contraseña debe tener entre 8 y 64 caracteres.'];
        }
        return ['valid' => true];
    }

    // ========================================================================================
    // --- FUNCIONES DE BASE DE DATOS Y ESTADO ---
    // ========================================================================================

    /**
     * Comprueba si una acción está bloqueada por demasiados intentos.
     */
    public static function checkRateLimit($pdo, $action, $maxAttempts, $lockoutMinutes, $customMsg = null) {
        $ip = self::getIpAddress();
        $stmt = $pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit && $limit['blocked_until'] && strtotime($limit['blocked_until']) > time()) {
            $remainingMinutes = ceil((strtotime($limit['blocked_until']) - time()) / 60);
            $msg = $customMsg ? str_replace('{minutes}', $remainingMinutes, $customMsg) : "Demasiados intentos. Por seguridad, por favor espera {$remainingMinutes} minutos e inténtalo de nuevo.";
            return ['allowed' => false, 'message' => $msg];
        }
        return ['allowed' => true];
    }

    /**
     * Registra un intento fallido y bloquea si se supera el máximo.
     */
    public static function recordAttempt($pdo, $action, $maxAttempts, $lockoutMinutes) {
        $ip = self::getIpAddress();
        $stmt = $pdo->prepare("SELECT attempts, blocked_until FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
        $limit = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($limit) {
            $attempts = ($limit['blocked_until'] && strtotime($limit['blocked_until']) <= time()) ? 1 : $limit['attempts'] + 1;
            $blockedUntil = ($attempts >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            $updateStmt = $pdo->prepare("UPDATE rate_limits SET attempts = ?, blocked_until = ? WHERE ip_address = ? AND action = ?");
            $updateStmt->execute([$attempts, $blockedUntil, $ip, $action]);
        } else {
            $blockedUntil = (1 >= $maxAttempts) ? date('Y-m-d H:i:s', strtotime("+{$lockoutMinutes} minutes")) : null;
            $insertStmt = $pdo->prepare("INSERT INTO rate_limits (ip_address, action, attempts, blocked_until) VALUES (?, ?, ?, ?)");
            $insertStmt->execute([$ip, $action, 1, $blockedUntil]);
        }
    }

    /**
     * Limpia los intentos registrados para una IP y acción.
     */
    public static function clearRateLimit($pdo, $action) {
        $ip = self::getIpAddress();
        $stmt = $pdo->prepare("DELETE FROM rate_limits WHERE ip_address = ? AND action = ?");
        $stmt->execute([$ip, $action]);
    }

    /**
     * Obtiene o crea las preferencias por defecto de un usuario.
     */
    public static function ensureDefaultPreferences($pdo, $userId) {
        $stmtPref = $pdo->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
        $stmtPref->execute([$userId]);
        $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);

        if (!$userPrefs) {
            $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
            $assignedLang = self::getClosestLanguage($acceptLang);
            
            $insPref = $pdo->prepare("INSERT INTO user_preferences (user_id, language, open_links_new_tab, theme, extended_alerts) VALUES (?, ?, 1, 'system', 0)");
            $insPref->execute([$userId, $assignedLang]);
            
            $stmtPref->execute([$userId]);
            $userPrefs = $stmtPref->fetch(PDO::FETCH_ASSOC);
        }
        return $userPrefs;
    }
}
?>