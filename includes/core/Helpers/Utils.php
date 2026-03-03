<?php
// includes/core/Helpers/Utils.php

namespace App\Core\Helpers;

class Utils {
    
    public static function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    public static function generateProfilePicture($username, $uuid) {
        $initial = mb_substr($username, 0, 1, "UTF-8");
        $allowedColors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];
        $randomColor = $allowedColors[array_rand($allowedColors)];
        $url = "https://ui-avatars.com/api/?name=" . urlencode($initial) . "&background=" . $randomColor . "&color=fff&size=512&font-size=0.5";
        $imageContent = @file_get_contents($url);
        if ($imageContent === false) return false;

        // Utilizamos la constante absoluta para no depender de rutas relativas
        $storageDir = ROOT_PATH . '/public/storage/profilePictures/default/';
        if (!is_dir($storageDir)) mkdir($storageDir, 0777, true);
        $fileName = $uuid . '.png';
        $filePath = $storageDir . $fileName;
        file_put_contents($filePath, $imageContent);

        return 'public/storage/profilePictures/default/' . $fileName;
    }

    public static function generateCSRFToken() {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function validateCSRFToken($token) {
        if (empty($_SESSION['csrf_token']) || empty($token)) return false;
        return hash_equals($_SESSION['csrf_token'], $token);
    }

    public static function getClosestLanguage($acceptLanguage) {
        $available = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'it-IT', 'es-419', 'es-MX', 'es-ES', 'pt-BR', 'pt-PT'];
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
                if (strcasecmp($lang, $avail) === 0) return $avail;
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

    public static function getIpAddress() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) $ip = $_SERVER['HTTP_CLIENT_IP'];
        elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        else $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return trim($ip);
    }

    public static function generateNumericCode($length = 12) {
        $code = '';
        for ($i = 0; $i < $length; $i++) $code .= mt_rand(0, 9);
        return $code;
    }

    public static function generateRecoveryCodes($count = 10, $length = 8) {
        $codes = [];
        $bytesNeeded = ceil($length / 2);
        for ($i = 0; $i < $count; $i++) {
            $codes[] = substr(bin2hex(random_bytes($bytesNeeded)), 0, $length);
        }
        return $codes;
    }

    public static function validateEmailFormat($email, $minTotal = 6, $maxTotal = 254, $minLocal = 2, $maxLocal = 64, $minDomain = 3, $maxDomain = 255) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return ['valid' => false, 'message' => 'El formato del correo electrónico no es válido.'];
        $emailLen = strlen($email);
        
        if ($emailLen < $minTotal || $emailLen > $maxTotal) return ['valid' => false, 'message' => "El correo debe tener en total entre {$minTotal} y {$maxTotal} caracteres."];
        $parts = explode('@', $email);
        if (count($parts) !== 2) return ['valid' => false, 'message' => 'El formato del correo electrónico es incorrecto.'];

        $localPart = $parts[0]; $domainPart = $parts[1];
        if (strlen($localPart) < $minLocal || strlen($localPart) > $maxLocal) return ['valid' => false, 'message' => "La parte local del correo debe tener entre {$minLocal} y {$maxLocal} caracteres."];
        if (strlen($domainPart) < $minDomain || strlen($domainPart) > $maxDomain) return ['valid' => false, 'message' => "El dominio del correo debe tener entre {$minDomain} y {$maxDomain} caracteres."];

        $subdomains = explode('.', $domainPart);
        if (count($subdomains) < 2) return ['valid' => false, 'message' => 'El dominio del correo electrónico debe incluir una extensión válida.'];
        foreach ($subdomains as $sub) {
            // El RFC de DNS (1035) limita cada etiqueta de subdominio a 63 caracteres. 
            if (strlen($sub) < 2 || strlen($sub) > 63) return ['valid' => false, 'message' => 'Cada parte del dominio separada por un punto debe tener entre 2 y 63 caracteres.'];
        }
        return ['valid' => true];
    }

    public static function validatePasswordFormat($password, $minLen = 8, $maxLen = 64) {
        $passLen = strlen($password);
        if ($passLen < $minLen || $passLen > $maxLen) return ['valid' => false, 'message' => "La contraseña debe tener entre {$minLen} y {$maxLen} caracteres."];
        return ['valid' => true];
    }
}
?>