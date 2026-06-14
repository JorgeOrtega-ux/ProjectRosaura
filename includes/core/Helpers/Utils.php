<?php
// includes/core/Helpers/Utils.php

namespace App\Core\Helpers;

use App\Core\Interfaces\SessionManagerInterface;

class Utils {
    
    public static function generateUUID() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function generateProfilePicture($username, $uuid) {
        $initial = mb_substr(mb_strtoupper($username, "UTF-8"), 0, 1, "UTF-8");
        $allowedColors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];
        $randomColor = $allowedColors[array_rand($allowedColors)];
        
        $url = "https://ui-avatars.com/api/?name=" . urlencode($initial) . "&background=" . $randomColor . "&color=fff&size=512&font-size=0.5";
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 3.0,
                'ignore_errors' => true
            ]
        ]);

        $imageContent = @file_get_contents($url, false, $context);
        
        if ($imageContent === false || empty($imageContent)) {
            return 'public/assets/img/fallbacks/avatar-default.png';
        }

        $storageDir = ROOT_PATH . '/public/storage/profilePictures/default/';
        if (!is_dir($storageDir)) mkdir($storageDir, 0777, true);
        
        $fileName = $uuid . '.png';
        $filePath = $storageDir . $fileName;
        file_put_contents($filePath, $imageContent);

        return 'public/storage/profilePictures/default/' . $fileName;
    }

    public static function generateCSRFToken(SessionManagerInterface $sessionManager) {
        return $sessionManager->getCsrfToken();
    }

    public static function validateCSRFToken($token, SessionManagerInterface $sessionManager) {
        return $sessionManager->validateCsrfToken($token ?? '');
    }

    public static function getClosestLanguage($acceptLanguage) {
        $available = array_keys(\App\Core\System\Translator::getAvailableLanguages());
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
        $realIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        
        $trustedProxies = ['127.0.0.1', '::1']; 
        
        $envProxies = \App\Core\Helpers\EnvLoader::get('TRUSTED_PROXIES', '');
        if (!empty($envProxies)) {
            $trustedProxies = array_merge($trustedProxies, array_map('trim', explode(',', $envProxies)));
        }

        $isTrusted = in_array($realIp, $trustedProxies) || filter_var($realIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;

        if ($isTrusted) {
            if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
                $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
            } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                $ipList = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
                $ip = trim($ipList[0]);
            } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
                $ip = $_SERVER['HTTP_X_REAL_IP'];
            } else {
                $ip = $realIp;
            }
        } else {
            $ip = $realIp;
        }

        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            $ip = '0.0.0.0';
        }

        return trim($ip);
    }

    public static function generateNumericCode($length = 12) {
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= random_int(0, 9);
        }
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
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return ['valid' => false, 'message_key' => 'error.invalid_email'];
        $emailLen = strlen($email);
        
        if ($emailLen < $minTotal || $emailLen > $maxTotal) return ['valid' => false, 'message_key' => 'error.invalid_email_length'];
        $parts = explode('@', $email);
        if (count($parts) !== 2) return ['valid' => false, 'message_key' => 'error.invalid_email'];

        $localPart = $parts[0]; $domainPart = $parts[1];
        if (strlen($localPart) < $minLocal || strlen($localPart) > $maxLocal) return ['valid' => false, 'message_key' => 'error.invalid_email_local_length'];
        if (strlen($domainPart) < $minDomain || strlen($domainPart) > $maxDomain) return ['valid' => false, 'message_key' => 'error.invalid_email_domain_length'];

        $subdomains = explode('.', $domainPart);
        if (count($subdomains) < 2) return ['valid' => false, 'message_key' => 'error.invalid_email_domain_format'];
        foreach ($subdomains as $sub) {
            if (strlen($sub) < 2 || strlen($sub) > 63) return ['valid' => false, 'message_key' => 'error.invalid_email_subdomain_length'];
        }
        return ['valid' => true];
    }

    public static function validatePasswordFormat($password, $minLen = 8, $maxLen = 64) {
        $passLen = strlen($password);
        if ($passLen < $minLen || $passLen > $maxLen) return ['valid' => false, 'message_key' => 'error.invalid_password_length'];
        return ['valid' => true];
    }

    public static function validateUsernameFormat($username, $minLen = 3, $maxLen = 32) {
        $userLen = mb_strlen(trim($username), 'UTF-8');
        if ($userLen < $minLen || $userLen > $maxLen) {
            return ['valid' => false, 'message_key' => 'validation.invalid_length'];
        }
        return ['valid' => true];
    }

    public static function getMaintenanceFilePath() {
        return dirname(__DIR__, 3) . '/storage/system/.maintenance';
    }

    public static function isMaintenanceActive() {
        return file_exists(self::getMaintenanceFilePath());
    }

    public static function enableMaintenance() {
        $path = self::getMaintenanceFilePath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($path, json_encode(['maintenance_started_at' => time()]));
        return true;
    }

    public static function disableMaintenance() {
        $path = self::getMaintenanceFilePath();
        if (file_exists($path)) {
            unlink($path);
        }
        return true;
    }

    private static $fallbacks = [
        'avatar' => 'public/assets/img/fallbacks/avatar-default.png'
    ];

    public static function getValidImage($path, $type = 'avatar') {
        $fallback = self::$fallbacks[$type] ?? self::$fallbacks['avatar'];
        
        if (empty($path)) {
            return $fallback;
        }

        $cleanPath = ltrim($path, '/');
        $absolutePath = ROOT_PATH . '/' . $cleanPath;

        if (file_exists($absolutePath) && is_file($absolutePath)) {
            return $cleanPath;
        }

        return $fallback;
    }

    public static function renderTurnstile(string $action = 'general'): string {
        $siteKey = \App\Core\Helpers\EnvLoader::get('TURNSTILE_SITE_KEY', '');
        
        if (empty($siteKey)) {
            return ''; 
        }

        return sprintf(
            '<div data-ref="turnstile-container" data-sitekey="%s" data-action="%s"></div>',
            htmlspecialchars($siteKey, ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($action, ENT_QUOTES, 'UTF-8')
        );
    }

    public static function uploadAndSanitizeImage($file, $uploadDir, $maxSizeMb) {
        if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message_key' => 'upload.error'];
        }

        if ($file['size'] > $maxSizeMb * 1024 * 1024) {
            return ['success' => false, 'message_key' => 'upload.size_exceeded'];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if ($mime !== 'image/png' && $mime !== 'image/jpeg') {
            return ['success' => false, 'message_key' => 'upload.invalid_format'];
        }

        $fileName = self::generateUUID() . (($mime === 'image/png') ? '.png' : '.jpg');
        
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $destPath = rtrim($uploadDir, '/') . '/' . $fileName;
        $imageRecreated = false;

        if ($mime === 'image/png') {
            $sourceImage = @imagecreatefrompng($file['tmp_name']);
            if ($sourceImage !== false) {
                imagealphablending($sourceImage, false);
                imagesavealpha($sourceImage, true);
                $imageRecreated = imagepng($sourceImage, $destPath);
                imagedestroy($sourceImage);
            }
        } elseif ($mime === 'image/jpeg') {
            $sourceImage = @imagecreatefromjpeg($file['tmp_name']);
            if ($sourceImage !== false) {
                $imageRecreated = imagejpeg($sourceImage, $destPath, 90);
                imagedestroy($sourceImage);
            }
        }

        if ($imageRecreated) {
            return ['success' => true, 'file_name' => $fileName];
        }

        return ['success' => false, 'message_key' => 'error.internal_server_error'];
    }

    public static function deleteOldAvatar($oldPicPath) {
        if (!empty($oldPicPath)) {
            if (strpos($oldPicPath, 'fallbacks/avatar-default.png') !== false) {
                return false;
            }

            if (strpos($oldPicPath, 'uploaded/') !== false || strpos($oldPicPath, 'default/') !== false) {
                $oldPicRelative = str_replace(['/ProjectRosaura/', APP_URL . '/'], '', $oldPicPath);
                $oldPath = ROOT_PATH . '/' . ltrim($oldPicRelative, '/');
                if (file_exists($oldPath) && is_file($oldPath)) {
                    unlink($oldPath);
                    return true;
                }
            }
        }
        return false;
    }

    public static function getRedisClient() {
        $redisHost = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
        $redisPort = (int)($_ENV['REDIS_PORT'] ?? 6379);
        $connectionParams = ['scheme' => 'tcp', 'host' => $redisHost, 'port' => $redisPort];
        
        if (!empty($_ENV['REDIS_PASS'])) {
            $connectionParams['password'] = $_ENV['REDIS_PASS'];
        }
        
        $client = new \Predis\Client($connectionParams);

        return new class($client) {
            private $client;
            
            public function __construct($client) { 
                $this->client = $client; 
            }
            
            public function __call($name, $args) {
                if ($name === 'rpush' && isset($args[1]) && !is_array($args[1])) {
                    $args[1] = [$args[1]];
                }
                return $this->client->$name(...$args);
            }
        };
    }

    public static function invalidateUserSessions(SessionManagerInterface $sessionManager, $userId, $flushAll = false, $selector = null) {
        if ($flushAll && method_exists($sessionManager, 'flushAllSessionsForUser')) {
            $sessionManager->flushAllSessionsForUser($userId);
        } elseif (!empty($selector) && method_exists($sessionManager, 'invalidateDeviceInPool')) {
            $sessionManager->invalidateDeviceInPool($selector);
        } elseif (method_exists($sessionManager, 'invalidateAccountInPool')) {
            $sessionManager->invalidateAccountInPool($userId);
        }
    }

    public static function isSecureConnection() {
        return (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
               (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    }

    public static function calculateExpirationDate($minutes = 15) {
        return date('Y-m-d H:i:s', strtotime("+{$minutes} minutes"));
    }

    public static function getCurrentDeviceSelector($userId = null) {
        if ($userId !== null && isset($_COOKIE['remember_tokens'])) {
            $tokensMap = json_decode($_COOKIE['remember_tokens'], true) ?: [];
            if (isset($tokensMap[$userId]) && is_string($tokensMap[$userId])) {
                return explode(':', $tokensMap[$userId])[0];
            }
        } elseif (isset($_COOKIE['remember_tokens'])) {
            $tokensMap = json_decode($_COOKIE['remember_tokens'], true) ?: [];
            if (!empty($tokensMap)) {
                $firstValue = reset($tokensMap);
                if (is_string($firstValue)) {
                    return explode(':', $firstValue)[0];
                }
            }
        }

        if (isset($_COOKIE['remember_token']) && is_string($_COOKIE['remember_token'])) {
            return explode(':', $_COOKIE['remember_token'])[0];
        }

        return '';
    }

    public static function getAllDeviceSelectors($userId = null) {
        $selectors = [];
        
        if (isset($_COOKIE['remember_tokens'])) {
            $tokensMap = json_decode($_COOKIE['remember_tokens'], true) ?: [];
            if (is_array($tokensMap)) {
                foreach ($tokensMap as $k => $cookieVal) {
                    if (!is_string($cookieVal)) continue;
                    if ($userId !== null && $k != $userId) continue;
                    
                    $parts = explode(':', $cookieVal);
                    if (count($parts) === 2) {
                        $selectors[] = $parts[0];
                    }
                }
            }
        } elseif (isset($_COOKIE['remember_token']) && is_string($_COOKIE['remember_token'])) {
            $parts = explode(':', $_COOKIE['remember_token']);
            if (count($parts) === 2) {
                $selectors[] = $parts[0];
            }
        }
        
        return $selectors;
    }

    public static function sanitizeText($text) {
        if (empty($text)) return null;
        $clean = strip_tags($text);
        $clean = htmlspecialchars(trim($clean), ENT_QUOTES, 'UTF-8');
        return empty($clean) ? null : $clean;
    }
}
?>