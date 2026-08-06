<?php
namespace App\Core\Helpers;
use App\Core\Interfaces\SessionManagerInterface;

class Utils {
    private static $s3Client = null;
    private static $canvasSizes = null;
    private static $sanctionReasons = null;

    public static function enforceIpRateLimit(string $actionKey, int $maxRequests = 60, int $windowSeconds = 60, bool $isJsonError = false): void {
        try {
            if (class_exists('\App\Config\Database\RedisCache')) {
                $redisObj = new \App\Config\Database\RedisCache();
                $redis = $redisObj->getClient();
                if ($redis) {
                    $ip = self::getIpAddress();
                    $safeIp = md5(trim(explode(',', $ip)[0]));
                    $rlKey = "rate_limit:{$actionKey}:{$safeIp}";
                    
                    $currentCount = $redis->incr($rlKey);
                    if ($currentCount == 1) {
                        $redis->expire($rlKey, $windowSeconds);
                    }
                    
                    if ($currentCount > $maxRequests) {
                        http_response_code(429);
                        if ($isJsonError || !empty($_SERVER['HTTP_X_SPA_REQUEST']) || strpos($_SERVER['REQUEST_URI'] ?? '', '/api/') !== false) {
                            header('Content-Type: application/json');
                            echo json_encode(['error' => 'Too Many Requests', 'redirect' => '/']);
                        } else {
                            echo "<!DOCTYPE html><html><head><title>Too Many Requests</title><style>body{font-family:sans-serif;text-align:center;padding:50px;}</style></head><body><h1>429 Too Many Requests</h1><p>Please wait a moment before trying again.</p></body></html>";
                        }
                        exit;
                    }
                }
            }
        } catch (\Throwable $e) {
            // Fail open
        }
    }

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

    public static function getSanctionReasons(): array {
        if (self::$sanctionReasons !== null) {
            return self::$sanctionReasons;
        }

        $path = defined('ROOT_PATH') ? ROOT_PATH . '/config/reasons.json' : dirname(__DIR__, 3) . '/config/reasons.json';
        if (file_exists($path)) {
            $json = file_get_contents($path);
            $data = json_decode($json, true);
            if (is_array($data)) {
                self::$sanctionReasons = $data;
                return self::$sanctionReasons;
            }
        }

        // Fallback robust reasons in case JSON file is missing or corrupted
        self::$sanctionReasons = [
            'suspensions' => [
                ['key' => 'reason_terms', 'icon' => 'gavel', 'default_duration' => 7],
                ['key' => 'reason_fake_info', 'icon' => 'info', 'default_duration' => 30],
                ['key' => 'reason_illegal', 'icon' => 'gavel', 'default_duration' => 30],
                ['key' => 'reason_fraud_use', 'icon' => 'credit_card', 'default_duration' => 14],
                ['key' => 'reason_abuse', 'icon' => 'front_hand', 'default_duration' => 3],
                ['key' => 'reason_prohibited_content', 'icon' => 'report', 'default_duration' => 7],
                ['key' => 'reason_ip_violation', 'icon' => 'copyright', 'default_duration' => 14],
                ['key' => 'reason_spam_bot', 'icon' => 'smart_toy', 'default_duration' => 7],
                ['key' => 'reason_security_breach', 'icon' => 'security', 'default_duration' => 30],
                ['key' => 'reason_unauthorized_commercial', 'icon' => 'storefront', 'default_duration' => 14]
            ],
            'report_messages' => [
                ['key' => 'spam', 'icon' => 'campaign'],
                ['key' => 'offensive', 'icon' => 'warning'],
                ['key' => 'harassment', 'icon' => 'front_hand'],
                ['key' => 'hate_speech', 'icon' => 'gavel'],
                ['key' => 'violence', 'icon' => 'dangerous'],
                ['key' => 'misinformation', 'icon' => 'info'],
                ['key' => 'privacy', 'icon' => 'privacy_tip']
            ],
            'delete_messages' => [
                ['key' => 'spam', 'icon' => 'campaign'],
                ['key' => 'offensive', 'icon' => 'warning'],
                ['key' => 'harassment', 'icon' => 'front_hand']
            ]
        ];
        return self::$sanctionReasons;
    }

    public static function isProgressiveLoadRequired(string $size): bool {
        $sizeKey = strtolower(trim($size));
        $sizes = self::getCanvasSizes();
        if (isset($sizes[$sizeKey]['progressive_load'])) {
            return (bool)$sizes[$sizeKey]['progressive_load'];
        }

        if (strpos($sizeKey, 'x') !== false) {
            $parts = explode('x', $sizeKey);
            $w = (int)($parts[0] ?? 0);
            $h = (int)($parts[1] ?? $w);
        } else {
            $w = (int)$sizeKey;
            $h = $w;
        }

        return ($w >= 1024 || $h >= 1024 || ($w * $h) >= 1048576);
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
                EnvLoader::get('AWS_ACCESS_KEY_ID', ''),
                EnvLoader::get('AWS_SECRET_ACCESS_KEY', '')
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
        
        if (str_starts_with($path, 'profilePictures/default/')) {
            // Intentar extraer la letra de la ruta legada, por ejemplo 'profilePictures/default/letters/O/...'
            if (preg_match('/letters\/([A-Z0-9])/i', $path, $matches)) {
                $letter = $matches[1];
                return self::generateProfilePicture($letter);
            }
            return self::generateProfilePicture('U');
        }
        
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


    public static function generateProfilePicture($text) {
        $cleanText = trim(preg_replace('/[^a-zA-Z0-9\s]/', '', $text));
        if (empty($cleanText)) {
            $cleanText = 'U';
        }
        $token = rtrim(strtr(base64_encode("RosauraUser:" . $cleanText), '+/', '-_'), '=');
        return '/avatar/' . $token;
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
        $trimmed = trim($username);
        $userLen = mb_strlen($trimmed, 'UTF-8');
        if ($userLen < $minLen || $userLen > $maxLen) {
            return ['valid' => false, 'message_key' => 'validation.invalid_length'];
        }
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $trimmed)) {
            return ['valid' => false, 'message_key' => 'validation.invalid_username_format'];
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


    private static $fallbacks = [
        'avatar' => '/avatar/Um9zYXVyYVVzZXI6VQ', // Token para "U"
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
            if (strpos($oldPicPath, 'fallbacks/avatar-default.png') !== false || strpos($oldPicPath, 'api/avatar.php') !== false) {
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