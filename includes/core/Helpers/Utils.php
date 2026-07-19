<?php
namespace App\Core\Helpers;
use App\Core\Interfaces\SessionManagerInterface;

class Utils {
    private static $s3Client = null;
    private static $canvasSizes = null;

    public static function getCanvasSizes(): array {
        if (self::$canvasSizes !== null) {
            return self::$canvasSizes;
        }

        $path = dirname(__DIR__, 3) . '/public/assets/data/canvas_sizes.json';
        if (file_exists($path)) {
            $json = file_get_contents($path);
            $data = json_decode($json, true);
            if (is_array($data)) {
                self::$canvasSizes = $data;
                return self::$canvasSizes;
            }
        }
        self::$canvasSizes = [
            '64x64' => ['label' => '64x64', 'icon' => 'crop_square']
        ];
        return self::$canvasSizes;
    }

    public static function getS3Client() {
        if (self::$s3Client === null) {
            $endpoint = EnvLoader::get('AWS_ENDPOINT', 'http://minio:9000');
            if (strpos($endpoint, 'http') !== 0) {
                $endpoint = 'http://' . $endpoint;
            }
            if (parse_url($endpoint, PHP_URL_PORT) === null) {
                $endpoint .= ':9000';
            }
            $credentials = new \Aws\Credentials\Credentials(
                EnvLoader::get('AWS_ACCESS_KEY_ID', 'admin'),
                EnvLoader::get('AWS_SECRET_ACCESS_KEY', 'password')
            );
            self::$s3Client = new \Aws\S3\S3Client([
                'version' => 'latest',
                'region'  => 'us-east-1',
                'endpoint' => $endpoint,
                'use_path_style_endpoint' => true,
                'credentials' => $credentials,
                'http' => [
                    'verify' => false
                ]
            ]);
        }
        return self::$s3Client;
    }

    public static function getS3PublicUrl($path) {
        if (empty($path)) return '';
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, 'data:')) return $path;
        
        $path = preg_replace('#^/?public/storage/#', '', ltrim($path, '/'));
        
        $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
        $publicUrl = rtrim(EnvLoader::get('AWS_PUBLIC_URL', 'http://localhost:9000'), '/');
        
        return $publicUrl . '/' . $bucket . '/' . ltrim($path, '/');
    }

    public static function generateUUID() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function getRandomColor() {
        return '#' . str_pad(dechex(mt_rand(0, 0xFFFFFF)), 6, '0', STR_PAD_LEFT);
    }

    public static function generateProfilePicture($text) {
        $colors = ['2563eb', '16a34a', '7c3aed', 'dc2626', 'ea580c', '374151'];
        $cleanText = strtoupper(trim(preg_replace('/[^a-zA-Z0-9]/', '', $text)));
        $initial = substr($cleanText, 0, 1);
        
        $category = 'letters';
        $folderName = $initial;

        if ($initial === '') {
            $initial = 'U';
            $folderName = '_symbol';
        } else if (is_numeric($initial)) {
            $category = 'numbers';
        }
        
        $colorIndex = abs(crc32($text)) % count($colors);
        $color = $colors[$colorIndex];
        
        $relPath = "profilePictures/default/$category/$folderName/$color.png";
        $localPath = defined('ROOT_PATH') ? ROOT_PATH . "/storage/public/$relPath" : '';

        if (!empty($localPath) && file_exists($localPath)) {
            return $relPath;
        }

        // --- FALLBACK ---
        $uuid = self::generateUUID();
        $backgroundColor = '#' . $color;
        
        $cleanBg = ltrim($backgroundColor, '#');
        $initialUrl = urlencode($initial);
        $apiUrl = "https://ui-avatars.com/api/?name={$initialUrl}&background={$cleanBg}&color=ffffff&size=256&font-size=0.5&format=png";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $imageContent = curl_exec($ch);
        curl_close($ch);

        if (!$imageContent) {
            $image = imagecreatetruecolor(256, 256);
            $bg = imagecolorallocate($image, hexdec(substr($color, 0, 2)), hexdec(substr($color, 2, 2)), hexdec(substr($color, 4, 2)));
            imagefill($image, 0, 0, $bg);
            $textColor = imagecolorallocate($image, 255, 255, 255);
            $fontPath = defined('ROOT_PATH') ? ROOT_PATH . '/public/assets/fonts/Inter-Bold.ttf' : '';
            
            if (!empty($fontPath) && file_exists($fontPath)) {
                imagettftext($image, 100, 0, 70, 170, $textColor, $fontPath, urldecode($initialUrl));
            } else {
                $tempImg = imagecreatetruecolor(20, 20);
                imagefill($tempImg, 0, 0, $bg);
                imagestring($tempImg, 5, 6, 2, urldecode($initialUrl), $textColor);
                imagecopyresized($image, $tempImg, 0, 0, 0, 0, 256, 256, 20, 20);
                imagedestroy($tempImg);
            }
            
            ob_start();
            imagepng($image);
            $imageContent = ob_get_clean();
            imagedestroy($image);
        }
        
        if ($imageContent === false) {
            return 'public/assets/img/fallbacks/avatar-default.png';
        }
        $fileName = $uuid . '.png';
        $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
        $s3Client = self::getS3Client();
        try {
            $s3Client->putObject([
                'Bucket' => $bucket,
                'Key'    => 'profilePictures/default/' . $fileName,
                'Body'   => $imageContent,
                'ContentType' => 'image/png'
            ]);
        } catch (\Throwable $e) {
            \App\Core\System\Logger::error('Failed to upload avatar to S3', ['exception' => $e->getMessage()]);
        }
        return 'profilePictures/default/' . $fileName;
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
        return dirname(__DIR__, 3) . '/storage/private/system/.maintenance';
    }

    public static function isMaintenanceActive() {
        return file_exists(self::getMaintenanceFilePath());
    }

    public static function enableMaintenance() {
        $path = self::getMaintenanceFilePath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
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
        'avatar' => 'public/assets/img/fallbacks/avatar-default.png',
        'canvas' => 'public/assets/img/fallbacks/canvas-default.png',
        'snapshot' => 'public/assets/img/fallbacks/canvas-default.png',
        'chat_attachment' => 'public/assets/img/fallbacks/canvas-default.png'
    ];

    public static function getValidImage($path, $type = 'avatar') {
        $fallback = self::$fallbacks[$type] ?? self::$fallbacks['avatar'];
        
        if (empty($path)) {
            return $fallback;
        }

        if (strpos($path, 'http') === 0) {
            return $path;
        }

        if (strpos($path, 'uploaded/') !== false || strpos($path, 'thumbnails/') !== false || strpos($path, 'profilePictures/') !== false) {
            return self::getS3PublicUrl($path);
        }

        return $path;
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
        $imageRecreated = false;
        $imageContent = null;

        if ($mime === 'image/png') {
            try {
                $sourceImage = imagecreatefrompng($file['tmp_name']);
                if ($sourceImage !== false) {
                    imagealphablending($sourceImage, false);
                    imagesavealpha($sourceImage, true);
                    ob_start();
                    imagepng($sourceImage);
                    $imageContent = ob_get_clean();
                    imagedestroy($sourceImage);
                    $imageRecreated = true;
                }
            } catch (\Throwable $e) {
                \App\Core\System\Logger::error('Image processing failed', ['format' => 'png', 'exception' => $e->getMessage()]);
            }
        } elseif ($mime === 'image/jpeg') {
            try {
                $sourceImage = imagecreatefromjpeg($file['tmp_name']);
                if ($sourceImage !== false) {
                    ob_start();
                    imagejpeg($sourceImage, null, 90);
                    $imageContent = ob_get_clean();
                    imagedestroy($sourceImage);
                    $imageRecreated = true;
                }
            } catch (\Throwable $e) {
                \App\Core\System\Logger::error('Image processing failed', ['format' => 'jpeg', 'exception' => $e->getMessage()]);
            }
        }

        if ($imageRecreated && $imageContent !== null) {
            $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
            $s3Client = self::getS3Client();
            $s3Key = trim($uploadDir, '/') . '/' . $fileName;
            $s3Key = preg_replace('#/+#', '/', ltrim($s3Key, '/'));
            try {
                $s3Client->putObject([
                    'Bucket' => $bucket,
                    'Key'    => ltrim($s3Key, '/'),
                    'Body'   => $imageContent,
                    'ContentType' => $mime
                ]);
                return ['success' => true, 'file_name' => $fileName];
            } catch (\Throwable $e) {
                \App\Core\System\Logger::error('Failed to upload image to S3', ['exception' => $e->getMessage()]);
            }
        }

        return ['success' => false, 'message_key' => 'error.internal_server_error'];
    }
    public static function deleteOldAvatar($oldPicPath) {
        if (!empty($oldPicPath)) {
            if (strpos($oldPicPath, 'fallbacks/avatar-default.png') !== false) {
                return false;
            }
            if (strpos($oldPicPath, 'uploaded/') !== false || strpos($oldPicPath, 'default/') !== false) {
                $s3Key = preg_replace('#^/?public/storage/#', '', ltrim($oldPicPath, '/'));
                
                $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
                $s3Client = self::getS3Client();
                try {
                    $s3Client->deleteObject([
                        'Bucket' => $bucket,
                        'Key'    => ltrim($s3Key, '/')
                    ]);
                    return true;
                } catch (\Throwable $e) {
                    \App\Core\System\Logger::error('Failed to delete avatar from S3', ['exception' => $e->getMessage()]);
                }
            }
        }
        return false;
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
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
            return true;
        }

        if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
            $realIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            $trustedProxies = ['127.0.0.1', '::1']; 
            
            $envProxies = \App\Core\Helpers\EnvLoader::get('TRUSTED_PROXIES', '');
            if (!empty($envProxies)) {
                $trustedProxies = array_merge($trustedProxies, array_map('trim', explode(',', $envProxies)));
            }

            $isTrusted = in_array($realIp, $trustedProxies) || filter_var($realIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;

            if ($isTrusted) {
                return true;
            }
        }

        return false;
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

    public static function formatNumber($number, $decimals = 0) {
        if (!is_numeric($number)) return '0';
        return number_format((float)$number, $decimals);
    }

    public static function censorText($text) {
        if (empty($text)) return $text;
        static $badWords = null;
        if ($badWords === null) {
            $path = __DIR__ . '/bad_words.php';
            if (file_exists($path)) {
                $badWords = require $path;
            } else {
                $badWords = [];
            }
        }
        if (empty($badWords)) return $text;

        foreach ($badWords as $word) {
            $pattern = '/\b' . preg_quote($word, '/') . '\b/iu';
            $replacement = str_repeat('*', mb_strlen($word));
            $text = preg_replace($pattern, $replacement, $text);
        }
        return $text;
    }
}