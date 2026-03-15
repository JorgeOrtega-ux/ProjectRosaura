<?php
// includes/core/Helpers/Utils.php

namespace App\Core\Helpers;

class Utils {
    
    // PALETA OFICIAL DE LA PLATAFORMA
    private static $brandPalette = [
        '#FF3B30', '#D32F2F', '#9A0007', '#FF9500', '#F57C00', '#E65100',
        '#FFCC00', '#FBC02D', '#F57F17', '#34C759', '#388E3C', '#1B5E20',
        '#00C7BE', '#0097A7', '#006064', '#007AFF', '#1976D2', '#0D47A1',
        '#5856D6', '#512DA8', '#311B92', '#FF2D55', '#C2185B', '#880E4F',
        '#8E8E93', '#48484A', '#1C1C1E', '#FFFFFF', '#000000'
    ];

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
            if (strlen($sub) < 2 || strlen($sub) > 63) return ['valid' => false, 'message' => 'Cada parte del dominio separada por un punto debe tener entre 2 y 63 caracteres.'];
        }
        return ['valid' => true];
    }

    public static function validatePasswordFormat($password, $minLen = 8, $maxLen = 64) {
        $passLen = strlen($password);
        if ($passLen < $minLen || $passLen > $maxLen) return ['valid' => false, 'message' => "La contraseña debe tener entre {$minLen} y {$maxLen} caracteres."];
        return ['valid' => true];
    }

    public static function validateImageDimensions($filePath, $minWidth, $minHeight) {
        $dimensions = @getimagesize($filePath);
        if (!$dimensions) return false;
        
        return ($dimensions[0] >= $minWidth && $dimensions[1] >= $minHeight);
    }

    public static function formatHeight($meters, $system = 'metric') {
        $m = (float)$meters;
        if ($m <= 0) return 'No especificado';
        
        if ($system === 'imperial') {
            $totalInches = $m * 39.3701;
            $feet = floor($totalInches / 12);
            $inches = round($totalInches % 12);
            if ($inches == 12) {
                $feet += 1;
                $inches = 0;
            }
            return "{$feet}'{$inches}\""; 
        }
        
        return number_format($m, 2) . ' m'; 
    }

    public static function formatWeight($kg, $system = 'metric') {
        $k = (float)$kg;
        if ($k <= 0) return 'No especificado';
        
        if ($system === 'imperial') {
            $lbs = round($k * 2.20462);
            return "{$lbs} lbs"; 
        }
        
        return number_format($k, 0) . ' kg'; 
    }

    public static function getFileMimeType($filePath) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $filePath);
        finfo_close($finfo);
        return $mime;
    }

    public static function clearRememberCookie() {
        if (isset($_COOKIE['remember_token'])) {
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

    public static function deleteDirectory(string $dir): bool {
        if (!file_exists($dir)) return true;
        if (!is_dir($dir)) return unlink($dir);
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') continue;
            if (!self::deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) return false;
        }
        return rmdir($dir);
    }

    public static function sanitizeIdentifier($string, $allowDashes = false) {
        if ($allowDashes) {
            return preg_replace('/[^a-zA-Z0-9_-]/', '', $string);
        }
        return preg_replace('/[^a-z0-9]/', '', strtolower($string));
    }

    public static function getNearestPaletteColor(int $r, int $g, int $b): string {
        $minDistance = null;
        $closestColor = '#000000';

        foreach (self::$brandPalette as $hexColor) {
            $hex = ltrim($hexColor, '#');
            
            if (strlen($hex) == 3) {
                $pr = hexdec(str_repeat(substr($hex, 0, 1), 2));
                $pg = hexdec(str_repeat(substr($hex, 1, 1), 2));
                $pb = hexdec(str_repeat(substr($hex, 2, 1), 2));
            } else {
                $pr = hexdec(substr($hex, 0, 2));
                $pg = hexdec(substr($hex, 2, 2));
                $pb = hexdec(substr($hex, 4, 2));
            }

            $distance = sqrt(pow($r - $pr, 2) + pow($g - $pg, 2) + pow($b - $pb, 2));

            if ($minDistance === null || $distance < $minDistance) {
                $minDistance = $distance;
                $closestColor = $hexColor;
            }
        }

        return $closestColor;
    }

    public static function getAverageColor(string $filepath): ?string {
        $mime = self::getFileMimeType($filepath);
        $img = null;
        
        switch ($mime) {
            case 'image/jpeg': 
                $img = @imagecreatefromjpeg($filepath); 
                break;
            case 'image/png': 
                $img = @imagecreatefrompng($filepath); 
                break;
            case 'image/webp': 
                $img = @imagecreatefromwebp($filepath); 
                break;
        }
        
        if (!$img) return null;
        
        $thumb = imagecreatetruecolor(1, 1);
        imagecopyresampled($thumb, $img, 0, 0, 0, 0, 1, 1, imagesx($img), imagesy($img));
        
        $rgb = imagecolorat($thumb, 0, 0);
        $r = ($rgb >> 16) & 0xFF;
        $g = ($rgb >> 8) & 0xFF;
        $b = $rgb & 0xFF;
        
        imagedestroy($img);
        imagedestroy($thumb);
        
        return self::getNearestPaletteColor($r, $g, $b);
    }
}
?>