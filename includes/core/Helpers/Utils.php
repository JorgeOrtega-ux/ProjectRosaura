<?php
namespace App\Core\Helpers;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Security\FileSecurityScanner;

class Utils {
    private static $s3Client = null;
    private static $canvasSizes = null;
    private static $sanctionReasons = null;

    /**
     * Centralized check to determine if an IP address belongs to a trusted proxy.
     */
    public static function isTrustedProxy(?string $ip = null): bool {
        $targetIp = $ip ?? ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        $trustedProxies = ['127.0.0.1', '::1']; 
        
        $envProxies = EnvLoader::get('TRUSTED_PROXIES', '');
        if (!empty($envProxies)) {
            $trustedProxies = array_merge($trustedProxies, array_filter(array_map('trim', explode(',', $envProxies))));
        }

        foreach ($trustedProxies as $proxy) {
            if ($proxy === $targetIp) {
                return true;
            }
            if (strpos($proxy, '/') !== false && self::ipMatchesCidr($targetIp, $proxy)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validates whether an IP address matches an IPv4 or IPv6 CIDR subnet.
     */
    public static function ipMatchesCidr(string $ip, string $cidr): bool {
        if (strpos($cidr, '/') === false) {
            return $ip === $cidr;
        }

        list($subnet, $bits) = explode('/', $cidr, 2);
        $bits = (int)$bits;

        // IPv4
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            if ($bits < 0 || $bits > 32) return false;
            $ipLong = ip2long($ip);
            $subnetLong = ip2long($subnet);
            $mask = $bits === 0 ? 0 : (~0 << (32 - $bits));
            return ($ipLong & $mask) === ($subnetLong & $mask);
        }

        // IPv6
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) && filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            if ($bits < 0 || $bits > 128) return false;
            $ipBin = inet_pton($ip);
            $subnetBin = inet_pton($subnet);
            if ($ipBin === false || $subnetBin === false) return false;

            $byteCount = intdiv($bits, 8);
            $bitRemainder = $bits % 8;

            if ($byteCount > 0 && substr($ipBin, 0, $byteCount) !== substr($subnetBin, 0, $byteCount)) {
                return false;
            }

            if ($bitRemainder > 0 && isset($ipBin[$byteCount], $subnetBin[$byteCount])) {
                $ipByte = ord($ipBin[$byteCount]);
                $subnetByte = ord($subnetBin[$byteCount]);
                $mask = (0xFF << (8 - $bitRemainder)) & 0xFF;
                if (($ipByte & $mask) !== ($subnetByte & $mask)) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    /**
     * Centralized normalization of storage paths (removing /public/storage/ prefixes and duplicate slashes).
     */
    public static function normalizeStoragePath(string $path): string {
        $clean = preg_replace('#^/?public/storage/#', '', ltrim($path, '/'));
        return preg_replace('#/+#', '/', ltrim($clean, '/'));
    }

    /**
     * Parses remember token cookies and returns a clean map of [userId => selector].
     */
    public static function parseRememberTokensCookie(?string $targetUserId = null): array {
        $selectors = [];
        if (isset($_COOKIE['remember_tokens'])) {
            $tokensMap = json_decode($_COOKIE['remember_tokens'], true) ?: [];
            if (is_array($tokensMap)) {
                foreach ($tokensMap as $userId => $cookieVal) {
                    if (!is_string($cookieVal)) continue;
                    if ($targetUserId !== null && (string)$userId !== (string)$targetUserId) continue;

                    $parts = explode(':', $cookieVal);
                    if (!empty($parts[0])) {
                        $selectors[(string)$userId] = $parts[0];
                    }
                }
            }
        } elseif (isset($_COOKIE['remember_token']) && is_string($_COOKIE['remember_token'])) {
            $parts = explode(':', $_COOKIE['remember_token']);
            if (!empty($parts[0])) {
                $selectors['default'] = $parts[0];
            }
        }
        return $selectors;
    }

    public static function enforceIpRateLimit(string $actionKey, int $maxRequests = 60, int $windowSeconds = 60, bool $isJsonError = false): void {
        try {
            if (class_exists('\App\Config\Database\RedisCache')) {
                $redisObj = new \App\Config\Database\RedisCache();
                $redis = $redisObj->getClient();
                if ($redis) {
                    $ip = self::getIpAddress();
                    $safeIp = md5($ip);
                    $luaScript = "
                        local key = KEYS[1]
                        local max_attempts = tonumber(ARGV[1])
                        local window_ms = tonumber(ARGV[2])
                        local now_ms = tonumber(ARGV[3])
                        local member = ARGV[4]

                        local clear_before = now_ms - window_ms
                        redis.call('ZREMRANGEBYSCORE', key, '-inf', clear_before)
                        local current_count = redis.call('ZCARD', key)

                        if current_count >= max_attempts then
                            return 0
                        end

                        redis.call('ZADD', key, now_ms, member)
                        local ttl_seconds = math.max(math.ceil(window_ms / 1000), 1)
                        redis.call('EXPIRE', key, ttl_seconds)
                        return 1
                    ";

                    $nowMs = (int)round(microtime(true) * 1000);
                    $windowMs = (int)($windowSeconds * 1000);
                    $uniqueMember = $nowMs . ':' . bin2hex(random_bytes(6));

                    $result = $redis->eval($luaScript, 1, $rlKey, $maxRequests, $windowMs, $nowMs, $uniqueMember);
                    
                    if ($result === 0) {
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

        $path = defined('ROOT_PATH') ? ROOT_PATH . '/config/data/reasons.json' : dirname(__DIR__, 3) . '/config/data/reasons.json';
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
        
        if (str_starts_with($path, '/avatar/') || str_starts_with($path, 'avatar/')) {
            return (defined('APP_URL') ? APP_URL : '') . '/' . ltrim($path, '/');
        }

        if (str_starts_with($path, '/assets/') || str_starts_with($path, 'assets/') || str_starts_with($path, 'public/assets/') || str_starts_with($path, '/public/assets/')) {
            $clean = preg_replace('#^/?(public/)?#', '', $path);
            return (defined('APP_URL') ? APP_URL : '') . '/' . ltrim($clean, '/');
        }

        if (str_starts_with($path, 'banners/default/') || str_starts_with($path, '/banners/default/')) {
            $fileName = basename($path);
            return (defined('APP_URL') ? APP_URL : '') . '/assets/img/banners/' . $fileName;
        }
        
        if (str_starts_with($path, 'profilePictures/default/')) {
            // Intentar extraer la letra de la ruta legada, por ejemplo 'profilePictures/default/letters/O/...'
            if (preg_match('/letters\/([A-Z0-9])/i', $path, $matches)) {
                $letter = $matches[1];
                return self::generateProfilePicture($letter);
            }
            return self::generateProfilePicture('U');
        }
        
        $cleanPath = self::normalizeStoragePath($path);
        
        $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
        $publicUrl = rtrim(EnvLoader::get('AWS_PUBLIC_URL', 'http://localhost:9000'), '/');
        
        return $publicUrl . '/' . $bucket . '/' . $cleanPath;
    }

    /**
     * Lista de los 5 banners SVG minimalistas pregenerados.
     */
    public static function getDefaultBanners(): array {
        return [
            'assets/img/banners/banner_1.svg',
            'assets/img/banners/banner_2.svg',
            'assets/img/banners/banner_3.svg',
            'assets/img/banners/banner_4.svg',
            'assets/img/banners/banner_5.svg'
        ];
    }

    /**
     * Obtiene un banner por defecto aleatorio para nuevos registros.
     */
    public static function getRandomDefaultBanner(): string {
        $banners = self::getDefaultBanners();
        $index = random_int(0, count($banners) - 1);
        return $banners[$index];
    }

    /**
     * Obtiene la ruta relativa de banner por defecto determinista para un usuario.
     */
    public static function getDefaultBannerRelForUser($seed): string {
        $banners = self::getDefaultBanners();
        $hashInput = (string)$seed;
        $index = abs(crc32($hashInput)) % count($banners);
        return $banners[$index];
    }

    /**
     * Obtiene la URL completa del banner por defecto para un usuario.
     */
    public static function getDefaultBannerForUser($seed): string {
        $relPath = self::getDefaultBannerRelForUser($seed);
        return (defined('APP_URL') ? APP_URL : '') . '/' . ltrim($relPath, '/');
    }

    /**
     * Comprueba si una ruta corresponde a un banner por defecto.
     */
    public static function isDefaultBanner(?string $path): bool {
        if (empty($path)) {
            return true;
        }
        return strpos($path, 'assets/img/banners/') !== false 
            || strpos($path, 'banners/default/') !== false;
    }

    public static function generateUUID() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function generateProfilePicture($text, $seed = '') {
        $cleanText = trim(preg_replace('/[^\p{L}\p{N}\s]/u', '', $text));
        if (empty($cleanText)) {
            $cleanText = 'U';
        }
        $payload = $cleanText;
        if ($seed !== '') {
            $payload .= ':' . $seed;
        }
        $token = rtrim(strtr(base64_encode("RosauraUser:" . $payload), '+/', '-_'), '=');
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

        if (self::isTrustedProxy($realIp)) {
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

    /**
     * Verify user identity via password or Google OAuth token.
     *
     * @param array $user
     * @param array $data
     * @return bool
     */
    public static function verifyUserIdentity(array $user, array $data): bool {
        if (empty($user)) {
            return false;
        }

        // 1. Check Google token verification if credential or google_token is passed
        $googleCredential = $data['credential'] ?? $data['google_token'] ?? null;
        if (!empty($googleCredential) && !empty($user['google_id'])) {
            $payload = \App\Core\Security\GoogleOAuthProvider::verifyToken($googleCredential);
            if ($payload && isset($payload['sub']) && (string)$payload['sub'] === (string)$user['google_id']) {
                return true;
            }
        }

        // 2. Check Password verification if password is submitted
        $submittedPassword = trim(
            $data['current_password'] ?? 
            $data['password'] ?? 
            $data['modal_verify_password'] ?? 
            $data['confirmSecPasswordInput'] ?? 
            $data['confirmPurchasePasswordInput'] ?? 
            ''
        );
        if (!empty($submittedPassword) && !empty($user['password']) && password_verify($submittedPassword, $user['password'])) {
            return true;
        }

        return false;
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
        'avatar' => 'public/assets/img/fallbacks/avatar-default.png',
        'canvas' => 'public/assets/img/fallbacks/canvas-default.png',
        'snapshot' => 'public/assets/img/fallbacks/canvas-default.png',
        'chat_attachment' => 'public/assets/img/fallbacks/canvas-default.png'
    ];

    public static function getValidImage($path, $type = 'avatar') {
        $fallback = self::$fallbacks[$type] ?? self::$fallbacks['avatar'];
        
        if (empty($path) || strpos($path, 'avatar-default.png') !== false) {
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

    public static function isDefaultAvatar($path) {
        if (empty($path)) {
            return true;
        }
        return strpos($path, 'profilePictures/default/') !== false 
            || strpos($path, 'fallbacks/avatar-default.png') !== false 
            || strpos($path, '/default/') !== false
            || strpos($path, '/avatar/') !== false 
            || str_starts_with($path, 'avatar/')
            || str_starts_with(ltrim($path, '/'), 'avatar/');
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

        $allowedMimes = [
            'image/png'  => '.png',
            'image/jpeg' => '.jpg',
            'image/webp' => '.webp'
        ];

        if (!isset($allowedMimes[$mime])) {
            return ['success' => false, 'message_key' => 'upload.invalid_format'];
        }

        $scanResult = FileSecurityScanner::scanFile($file['tmp_name']);
        if (!$scanResult['clean']) {
            \App\Core\System\Logger::security("Malicious upload blocked by FileSecurityScanner", 'critical', [
                'threat' => $scanResult['threat'],
                'engine' => $scanResult['engine']
            ]);
            return ['success' => false, 'message_key' => 'upload.threat_detected'];
        }

        $extension = $allowedMimes[$mime];
        $fileName = self::generateUUID() . $extension;
        $imageContent = self::renderSanitizedImageContent($file['tmp_name'], $mime);

        if ($imageContent !== null) {
            $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
            $s3Client = self::getS3Client();
            $s3Key = self::normalizeStoragePath($uploadDir . '/' . $fileName);
            try {
                $s3Client->putObject([
                    'Bucket' => $bucket,
                    'Key'    => $s3Key,
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

    private static function renderSanitizedImageContent(string $tmpPath, string $mime): ?string {
        try {
            $sourceImage = false;
            $hasAlpha = false;

            if ($mime === 'image/png') {
                $sourceImage = imagecreatefrompng($tmpPath);
                $hasAlpha = true;
            } elseif ($mime === 'image/jpeg') {
                $sourceImage = imagecreatefromjpeg($tmpPath);
            } elseif ($mime === 'image/webp' && function_exists('imagecreatefromwebp')) {
                $sourceImage = imagecreatefromwebp($tmpPath);
                $hasAlpha = true;
            }

            if ($sourceImage === false || $sourceImage === null) {
                return null;
            }

            if ($hasAlpha) {
                imagealphablending($sourceImage, false);
                imagesavealpha($sourceImage, true);
            }

            ob_start();
            if ($mime === 'image/png') {
                imagepng($sourceImage);
            } elseif ($mime === 'image/jpeg') {
                imagejpeg($sourceImage, null, 90);
            } elseif ($mime === 'image/webp' && function_exists('imagewebp')) {
                imagewebp($sourceImage, null, 90);
            }
            $imageContent = ob_get_clean();
            imagedestroy($sourceImage);

            return $imageContent ?: null;
        } catch (\Throwable $e) {
            \App\Core\System\Logger::error('Image processing failed', ['format' => $mime, 'exception' => $e->getMessage()]);
            return null;
        }
    }

    public static function deleteOldAvatar($oldPicPath) {
        if (!empty($oldPicPath)) {
            if (strpos($oldPicPath, 'fallbacks/avatar-default.png') !== false || strpos($oldPicPath, 'api/avatar.php') !== false) {
                return false;
            }
            if (strpos($oldPicPath, 'uploaded/') !== false || strpos($oldPicPath, 'default/') !== false) {
                $s3Key = self::normalizeStoragePath($oldPicPath);
                
                $bucket = EnvLoader::get('AWS_BUCKET', 'rosaura-storage');
                $s3Client = self::getS3Client();
                try {
                    $s3Client->deleteObject([
                        'Bucket' => $bucket,
                        'Key'    => $s3Key
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

    public static function isSecureConnection(): bool {
        if (isset($_SERVER['HTTPS']) && ($_SERVER['HTTPS'] === 'on' || $_SERVER['HTTPS'] === '1')) {
            return true;
        }

        if (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443) {
            return true;
        }

        if (self::isTrustedProxy()) {
            if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') {
                return true;
            }
            if (isset($_SERVER['HTTP_CF_VISITOR']) && strpos($_SERVER['HTTP_CF_VISITOR'], '"scheme":"https"') !== false) {
                return true;
            }
            if (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && strtolower($_SERVER['HTTP_X_FORWARDED_SSL']) === 'on') {
                return true;
            }
            if (isset($_SERVER['HTTP_FRONT_END_HTTPS']) && strtolower($_SERVER['HTTP_FRONT_END_HTTPS']) === 'on') {
                return true;
            }
        }

        if (defined('APP_URL') && str_starts_with(APP_URL, 'https://')) {
            return true;
        }

        return false;
    }

    public static function calculateExpirationDate($minutes = 15) {
        return date('Y-m-d H:i:s', strtotime("+{$minutes} minutes"));
    }

    public static function getCurrentDeviceSelector($userId = null) {
        $tokens = self::parseRememberTokensCookie($userId);
        if ($userId !== null && isset($tokens[(string)$userId])) {
            return $tokens[(string)$userId];
        }
        return !empty($tokens) ? reset($tokens) : '';
    }

    public static function getAllDeviceSelectors($userId = null) {
        return array_values(self::parseRememberTokensCookie($userId));
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

    public static function formatBytes(int $bytes, int $precision = 1): string {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min((int)$pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));
        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    public static function censorText($text) {
        if (empty($text)) return $text;
        static $badWords = null;
        if ($badWords === null) {
            $path = defined('ROOT_PATH') ? ROOT_PATH . '/config/data/bad_words.json' : dirname(__DIR__, 3) . '/config/data/bad_words.json';
            if (file_exists($path)) {
                $badWords = json_decode(file_get_contents($path), true) ?? [];
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

    public static function getEmptyGraphicSvg(string $type): string {
        switch ($type) {
            case 'trash':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="trashCanGrad" x1="40" y1="56" x2="100" y2="120" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="45%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                        <linearGradient id="trashLidGrad" x1="30" y1="20" x2="80" y2="60" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                        <linearGradient id="trashHighlight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
                            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
                        </linearGradient>
                        <linearGradient id="butterflyWing" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#f4f4f5"/>
                            <stop offset="100%" stop-color="#a1a1aa"/>
                        </linearGradient>
                        <linearGradient id="butterflyLowerWing" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#d4d4d8"/>
                            <stop offset="100%" stop-color="#71717a"/>
                        </linearGradient>
                    </defs>
                    <path d="M46 62 L52 116 C52.5 122 87.5 122 88 116 L94 62 Z" fill="url(#trashCanGrad)"/>
                    <rect x="55" y="66" width="5" height="48" rx="2.5" fill="rgba(255,255,255,0.12)"/>
                    <rect x="67.5" y="66" width="5" height="50" rx="2.5" fill="rgba(255,255,255,0.2)"/>
                    <rect x="80" y="66" width="5" height="48" rx="2.5" fill="rgba(0,0,0,0.3)"/>
                    <ellipse cx="70" cy="62" rx="25" ry="7" fill="#27272a"/>
                    <ellipse cx="70" cy="62" rx="22" ry="5.5" fill="#18181b"/>
                    <ellipse cx="70" cy="62" rx="16" ry="3.5" fill="#3f3f46" opacity="0.6"/>
                    <g transform="rotate(-24 46 44)">
                        <ellipse cx="64" cy="46" rx="28" ry="7" fill="url(#trashLidGrad)"/>
                        <path d="M38 46 C38 36 90 36 90 46 Z" fill="url(#trashLidGrad)"/>
                        <path d="M42 43 C46 38 82 38 86 43" stroke="url(#trashHighlight)" stroke-width="2" stroke-linecap="round" fill="none"/>
                        <path d="M58 35 C58 30 70 30 70 35" stroke="#e4e4e7" stroke-width="3" stroke-linecap="round" fill="none"/>
                    </g>
                    <g transform="translate(90, 36)">
                        <path d="M-1 -1 C-6 -8 -13 -6 -10 1 C-8 4 -3 2 -1 0 Z" fill="url(#butterflyWing)"/>
                        <path d="M1 -1 C6 -8 13 -6 10 1 C8 4 3 2 1 0 Z" fill="url(#butterflyWing)"/>
                        <path d="M-1 1 C-6 5 -10 9 -6 11 C-3 11 -1 5 -1 1 Z" fill="url(#butterflyLowerWing)"/>
                        <path d="M1 1 C6 5 10 9 6 11 C3 11 1 5 1 1 Z" fill="url(#butterflyLowerWing)"/>
                        <ellipse cx="0" cy="1" rx="1.5" ry="5.5" fill="#27272a"/>
                    </g>
                    <g>
                        <path d="M108 24 L109.5 28.5 L114 30 L109.5 31.5 L108 36 L106.5 31.5 L102 30 L106.5 28.5 Z" fill="#e4e4e7"/>
                        <path d="M30 42 L31 45 L34 46 L31 47 L30 50 L29 47 L26 46 L29 45 Z" fill="#a1a1aa"/>
                        <path d="M84 18 L85 20 L87 21 L85 22 L84 24 L83 22 L81 21 L83 20 Z" fill="#71717a"/>
                    </g>
                </svg>';

            case 'search':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="searchGlass" x1="30" y1="26" x2="86" y2="82" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
                            <stop offset="100%" stop-color="#71717a" stop-opacity="0.05"/>
                        </linearGradient>
                        <linearGradient id="searchRim" x1="28" y1="24" x2="88" y2="84" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#a1a1aa"/>
                            <stop offset="50%" stop-color="#71717a"/>
                            <stop offset="100%" stop-color="#3f3f46"/>
                        </linearGradient>
                        <linearGradient id="searchHandleGrad" x1="76" y1="76" x2="114" y2="114" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                    </defs>
                    <circle cx="58" cy="54" r="38" stroke="var(--border-color, #3f3f46)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.4"/>
                    <path d="M80 76 L110 106" stroke="url(#searchHandleGrad)" stroke-width="12" stroke-linecap="round"/>
                    <path d="M80 76 L110 106" stroke="#a1a1aa" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
                    <circle cx="110" cy="106" r="6" fill="#27272a"/>
                    <circle cx="58" cy="54" r="30" fill="url(#searchGlass)" stroke="url(#searchRim)" stroke-width="6"/>
                    <path d="M38 42 C44 34 54 30 66 32" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.5" fill="none"/>
                    <circle cx="54" cy="50" r="3.5" fill="#e4e4e7"/>
                    <circle cx="68" cy="60" r="2.5" fill="#a1a1aa"/>
                    <circle cx="48" cy="62" r="2" fill="#71717a"/>
                    <g>
                        <path d="M106 28 L107.5 32.5 L112 34 L107.5 35.5 L106 40 L104.5 35.5 L100 34 L104.5 32.5 Z" fill="#e4e4e7"/>
                        <path d="M22 66 L23 69 L26 70 L23 71 L22 74 L21 71 L18 70 L21 69 Z" fill="#a1a1aa"/>
                        <path d="M84 18 L85 20 L87 21 L85 22 L84 24 L83 22 L81 21 L83 20 Z" fill="#71717a"/>
                    </g>
                </svg>';

            case 'snapshots':
            case 'gallery':
            case 'templates':
            case 'template':
            case 'library':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="photoGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <g transform="rotate(-12 60 70)">
                        <rect x="36" y="32" width="58" height="68" rx="8" fill="var(--bg-surface-alt, #27272a)" stroke="var(--border-color, #3f3f46)" stroke-width="1.5"/>
                        <rect x="42" y="38" width="46" height="42" rx="5" fill="#3f3f46" opacity="0.4"/>
                    </g>
                    <g transform="rotate(8 72 70)">
                        <rect x="42" y="30" width="60" height="72" rx="8" fill="var(--bg-surface, #18181b)" stroke="var(--border-color, #3f3f46)" stroke-width="1.5"/>
                        <rect x="48" y="36" width="48" height="46" rx="5" fill="url(#photoGrad)"/>
                        <circle cx="80" cy="48" r="5" fill="#e4e4e7"/>
                        <path d="M48 76 L62 58 L72 68 L82 54 L96 76 Z" fill="rgba(255,255,255,0.18)"/>
                        <path d="M58 76 L70 62 L80 72 L96 76 Z" fill="rgba(255,255,255,0.28)"/>
                        <circle cx="88" cy="88" r="7" fill="#52525b"/>
                        <path d="M88 86 C87 84 84 84 84 86 C84 88 88 91 88 91 C88 91 92 88 92 86 C92 84 89 84 88 86 Z" fill="#ffffff"/>
                    </g>
                    <g>
                        <path d="M112 24 L113.5 28.5 L118 30 L113.5 31.5 L112 36 L110.5 31.5 L106 30 L110.5 28.5 Z" fill="#e4e4e7"/>
                        <path d="M26 40 L27 43 L30 44 L27 45 L26 48 L25 45 L22 44 L25 43 Z" fill="#a1a1aa"/>
                    </g>
                </svg>';

            case 'explore':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="globeGrad" x1="30" y1="30" x2="110" y2="110" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                        <linearGradient id="ringGrad" x1="20" y1="70" x2="120" y2="70" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#a1a1aa"/>
                            <stop offset="50%" stop-color="#71717a"/>
                            <stop offset="100%" stop-color="#3f3f46"/>
                        </linearGradient>
                    </defs>
                    <circle cx="70" cy="68" r="32" fill="url(#globeGrad)" stroke="#52525b" stroke-width="1.5"/>
                    <rect x="56" y="52" width="10" height="8" rx="2" fill="rgba(255,255,255,0.2)"/>
                    <rect x="68" y="56" width="16" height="10" rx="3" fill="rgba(255,255,255,0.15)"/>
                    <rect x="52" y="68" width="14" height="12" rx="3" fill="rgba(255,255,255,0.2)"/>
                    <rect x="72" y="74" width="12" height="8" rx="2" fill="rgba(255,255,255,0.15)"/>
                    <ellipse cx="70" cy="68" rx="54" ry="16" stroke="url(#ringGrad)" stroke-width="3.5" transform="rotate(-22 70 68)" opacity="0.8"/>
                    <g>
                        <path d="M116 26 L117.5 30.5 L122 32 L117.5 33.5 L116 38 L114.5 33.5 L110 32 L114.5 30.5 Z" fill="#e4e4e7"/>
                        <path d="M24 44 L25 47 L28 48 L25 49 L24 52 L23 49 L20 48 L23 47 Z" fill="#a1a1aa"/>
                        <path d="M96 102 L97 104 L99 105 L97 106 L96 108 L95 106 L93 105 L95 104 Z" fill="#71717a"/>
                    </g>
                </svg>';

            case 'error':
            case 'wifi_off':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="shieldGrad" x1="30" y1="20" x2="110" y2="100" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                    </defs>
                    <path d="M70 28 L104 42 C104 76 70 102 70 102 C70 102 36 76 36 42 Z" fill="url(#shieldGrad)" stroke="#52525b" stroke-width="1.5"/>
                    <rect x="67" y="46" width="6" height="24" rx="3" fill="#e4e4e7"/>
                    <circle cx="70" cy="80" r="3.5" fill="#e4e4e7"/>
                    <g>
                        <path d="M112 30 L113.5 34.5 L118 36 L113.5 37.5 L112 42 L110.5 37.5 L106 36 L110.5 34.5 Z" fill="#e4e4e7"/>
                        <path d="M26 50 L27 53 L30 54 L27 55 L26 58 L25 55 L22 54 L25 53 Z" fill="#71717a"/>
                    </g>
                </svg>';

            case 'users':
            case 'team':
            case 'members':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="userGradMain" x1="35" y1="35" x2="105" y2="105" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                        <linearGradient id="userGradBack" x1="30" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <g opacity="0.6">
                        <circle cx="48" cy="46" r="14" fill="url(#userGradBack)" stroke="#52525b" stroke-width="1.5"/>
                        <path d="M28 84 C28 70 38 68 48 68 C58 68 68 70 68 84 Z" fill="url(#userGradBack)" stroke="#52525b" stroke-width="1.5"/>
                    </g>
                    <g opacity="0.6">
                        <circle cx="92" cy="46" r="14" fill="url(#userGradBack)" stroke="#52525b" stroke-width="1.5"/>
                        <path d="M72 84 C72 70 82 68 92 68 C102 68 112 70 112 84 Z" fill="url(#userGradBack)" stroke="#52525b" stroke-width="1.5"/>
                    </g>
                    <circle cx="70" cy="50" r="18" fill="url(#userGradMain)" stroke="#71717a" stroke-width="2"/>
                    <circle cx="70" cy="46" r="6" fill="#e4e4e7" opacity="0.8"/>
                    <path d="M44 98 C44 80 56 76 70 76 C84 76 96 80 96 98 Z" fill="url(#userGradMain)" stroke="#71717a" stroke-width="2"/>
                    <rect x="62" y="82" width="16" height="4" rx="2" fill="#e4e4e7" opacity="0.5"/>
                    <g>
                        <path d="M116 28 L117.5 32.5 L122 34 L117.5 35.5 L116 40 L114.5 35.5 L110 34 L114.5 32.5 Z" fill="#e4e4e7"/>
                        <path d="M22 46 L23 49 L26 50 L23 51 L22 54 L21 51 L18 50 L21 49 Z" fill="#a1a1aa"/>
                        <path d="M102 96 L103 98 L105 99 L103 100 L102 102 L101 100 L99 99 L101 98 Z" fill="#71717a"/>
                    </g>
                </svg>';

            case 'roles':
            case 'permissions':
            case 'shield':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="rolesShieldGrad" x1="30" y1="20" x2="110" y2="105" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <path d="M70 24 L106 38 C106 78 70 106 70 106 C70 106 34 78 34 38 Z" fill="url(#rolesShieldGrad)" stroke="#71717a" stroke-width="2"/>
                    <path d="M70 32 L98 44 C98 74 70 96 70 96 C70 96 42 74 42 44 Z" fill="var(--bg-surface, #18181b)" stroke="#52525b" stroke-width="1.5"/>
                    <circle cx="70" cy="56" r="10" fill="url(#rolesShieldGrad)" stroke="#a1a1aa" stroke-width="1.5"/>
                    <path d="M68 62 L66 76 C66 78 74 78 74 76 L72 62 Z" fill="#e4e4e7"/>
                    <g>
                        <path d="M114 26 L115.5 30.5 L120 32 L115.5 33.5 L114 38 L112.5 33.5 L108 32 L112.5 30.5 Z" fill="#e4e4e7"/>
                        <path d="M24 46 L25 49 L28 50 L25 51 L24 54 L23 51 L20 50 L23 49 Z" fill="#a1a1aa"/>
                        <path d="M96 98 L97 100 L99 101 L97 102 L96 104 L95 102 L93 101 L95 100 Z" fill="#71717a"/>
                    </g>
                </svg>';

            case 'messages':
            case 'chat':
            case 'comments':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="chatBubble1" x1="20" y1="25" x2="90" y2="85" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                        <linearGradient id="chatBubble2" x1="50" y1="50" x2="115" y2="110" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <path d="M30 36 C30 28 86 28 86 36 L86 64 C86 72 30 72 30 64 L30 76 L44 64 Z" fill="url(#chatBubble1)" stroke="#52525b" stroke-width="1.5" opacity="0.6"/>
                    <path d="M50 56 C50 46 110 46 110 56 L110 86 C110 96 74 96 74 96 L60 108 L62 96 L50 96 Z" fill="url(#chatBubble2)" stroke="#71717a" stroke-width="1.5"/>
                    <circle cx="68" cy="74" r="3.5" fill="#e4e4e7"/>
                    <circle cx="80" cy="74" r="3.5" fill="#d4d4d8"/>
                    <circle cx="92" cy="74" r="3.5" fill="#a1a1aa"/>
                    <g>
                        <path d="M116 26 L117.5 30.5 L122 32 L117.5 33.5 L116 38 L114.5 33.5 L110 32 L114.5 30.5 Z" fill="#e4e4e7"/>
                        <path d="M22 60 L23 63 L26 64 L23 65 L22 68 L21 65 L18 64 L21 63 Z" fill="#a1a1aa"/>
                    </g>
                </svg>';

            case 'backups':
            case 'cloud':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="cloudGradBackups" x1="30" y1="20" x2="110" y2="85" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                        <linearGradient id="discGrad" x1="40" y1="70" x2="100" y2="110" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <path d="M48 58 C42 58 36 63 36 70 C36 76 40 80 46 80 L94 80 C100 80 106 75 106 69 C106 63 101 58 95 58 C94 51 88 46 81 46 C77 46 73 48 70 51 C67 46 61 43 55 46 C50 48 48 53 48 58 Z" fill="url(#cloudGradBackups)" stroke="#71717a" stroke-width="2"/>
                    <path d="M42 90 L42 102 C42 108 98 108 98 102 L98 90 Z" fill="url(#discGrad)" stroke="#52525b" stroke-width="1.5"/>
                    <ellipse cx="70" cy="90" rx="28" ry="6" fill="#3f3f46" stroke="#71717a" stroke-width="1.5"/>
                    <circle cx="88" cy="98" r="2" fill="#22c55e"/>
                    <g>
                        <path d="M116 24 L117.5 28.5 L122 30 L117.5 31.5 L116 36 L114.5 31.5 L110 30 L114.5 28.5 Z" fill="#e4e4e7"/>
                        <path d="M24 40 L25 43 L28 44 L25 45 L24 48 L23 45 L20 44 L23 43 Z" fill="#a1a1aa"/>
                    </g>
                </svg>';

            case 'logs':
            case 'history':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="docGradLogs" x1="30" y1="20" x2="105" y2="110" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <rect x="40" y="26" width="60" height="82" rx="8" fill="url(#docGradLogs)" stroke="#71717a" stroke-width="2"/>
                    <path d="M78 26 L100 48 L78 48 Z" fill="#71717a"/>
                    <rect x="50" y="44" width="20" height="4" rx="2" fill="#e4e4e7"/>
                    <rect x="50" y="56" width="40" height="3" rx="1.5" fill="#a1a1aa"/>
                    <rect x="50" y="66" width="36" height="3" rx="1.5" fill="#71717a"/>
                    <rect x="50" y="76" width="32" height="3" rx="1.5" fill="#52525b"/>
                    <rect x="50" y="86" width="24" height="3" rx="1.5" fill="#71717a"/>
                    <g>
                        <path d="M114 22 L115.5 26.5 L120 28 L115.5 29.5 L114 34 L112.5 29.5 L108 28 L112.5 26.5 Z" fill="#e4e4e7"/>
                        <path d="M26 54 L27 57 L30 58 L27 59 L26 62 L25 59 L22 58 L25 57 Z" fill="#a1a1aa"/>
                        <path d="M98 104 L99 106 L101 107 L99 108 L98 110 L97 108 L95 107 L97 106 Z" fill="#71717a"/>
                    </g>
                </svg>';

            case 'advertisements':
            case 'campaign':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="adHornGrad" x1="30" y1="30" x2="105" y2="105" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                    </defs>
                    <g transform="rotate(-15 70 70)">
                        <path d="M42 54 L62 54 L88 38 L88 92 L62 76 L42 76 Z" fill="url(#adHornGrad)" stroke="#71717a" stroke-width="2"/>
                        <ellipse cx="88" cy="65" rx="6" ry="27" fill="#3f3f46" stroke="#a1a1aa" stroke-width="2"/>
                        <path d="M48 76 L52 98 C52 100 58 100 58 98 L60 76 Z" fill="#27272a" stroke="#52525b" stroke-width="1.5"/>
                        <path d="M100 52 C106 58 106 72 100 78" stroke="#e4e4e7" stroke-width="3" stroke-linecap="round" fill="none"/>
                        <path d="M108 44 C116 54 116 76 108 86" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>
                    </g>
                    <g>
                        <path d="M116 20 L117.5 24.5 L122 26 L117.5 27.5 L116 32 L114.5 27.5 L110 26 L114.5 24.5 Z" fill="#e4e4e7"/>
                        <path d="M22 72 L23 75 L26 76 L23 77 L22 80 L21 77 L18 76 L21 75 Z" fill="#a1a1aa"/>
                    </g>
                </svg>';

            case 'subscriptions':
            case 'billing':
            case 'receipt':
            case 'payment':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="cardGradSub" x1="25" y1="35" x2="115" y2="95" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                    </defs>
                    <rect x="30" y="42" width="80" height="54" rx="10" fill="url(#cardGradSub)" stroke="#71717a" stroke-width="2"/>
                    <rect x="30" y="54" width="80" height="10" fill="#18181b"/>
                    <rect x="42" y="74" width="16" height="12" rx="3" fill="#e4e4e7" opacity="0.7"/>
                    <g transform="translate(86, 78)">
                        <path d="M0 -8 L2.4 -2.5 L8.5 -2.5 L3.6 1.2 L5.5 7 L0 3.5 L-5.5 7 L-3.6 1.2 L-8.5 -2.5 L-2.4 -2.5 Z" fill="#fbbf24"/>
                    </g>
                    <g>
                        <path d="M116 24 L117.5 28.5 L122 30 L117.5 31.5 L116 36 L114.5 31.5 L110 30 L114.5 28.5 Z" fill="#e4e4e7"/>
                        <path d="M22 46 L23 49 L26 50 L23 51 L22 54 L21 51 L18 50 L21 49 Z" fill="#a1a1aa"/>
                        <path d="M98 104 L99 106 L101 107 L99 108 L98 110 L97 108 L95 107 L97 106 Z" fill="#71717a"/>
                    </g>
                </svg>';

            case 'reports':
            case 'check':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="checkGradRep" x1="30" y1="25" x2="110" y2="105" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <circle cx="70" cy="66" r="36" fill="url(#checkGradRep)" stroke="#71717a" stroke-width="2"/>
                    <circle cx="70" cy="66" r="28" fill="var(--bg-surface, #18181b)" stroke="#52525b" stroke-width="1.5"/>
                    <path d="M54 66 L65 77 L86 54" stroke="#22c55e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                    <g>
                        <path d="M116 26 L117.5 30.5 L122 32 L117.5 33.5 L116 38 L114.5 33.5 L110 32 L114.5 30.5 Z" fill="#e4e4e7"/>
                        <path d="M24 46 L25 49 L28 50 L25 51 L24 54 L23 51 L20 50 L23 49 Z" fill="#a1a1aa"/>
                    </g>
                </svg>';

            case 'invites':
            case 'requests':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="inviteGrad" x1="30" y1="30" x2="110" y2="100" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#71717a"/>
                            <stop offset="50%" stop-color="#52525b"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                    </defs>
                    <rect x="34" y="40" width="72" height="54" rx="8" fill="url(#inviteGrad)" stroke="#71717a" stroke-width="2"/>
                    <path d="M36 44 L70 68 L104 44" stroke="#e4e4e7" stroke-width="2" stroke-linecap="round" fill="none"/>
                    <circle cx="70" cy="68" r="8" fill="#18181b" stroke="#71717a" stroke-width="1.5"/>
                    <path d="M66 68 L74 68 M70 64 L70 72" stroke="#e4e4e7" stroke-width="2" stroke-linecap="round"/>
                    <g>
                        <path d="M116 24 L117.5 28.5 L122 30 L117.5 31.5 L116 36 L114.5 31.5 L110 30 L114.5 28.5 Z" fill="#e4e4e7"/>
                        <path d="M22 50 L23 53 L26 54 L23 55 L22 58 L21 55 L18 54 L21 53 Z" fill="#a1a1aa"/>
                    </g>
                </svg>';

            case 'sanctions':
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="sanctionGrad" x1="30" y1="20" x2="110" y2="105" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#18181b"/>
                        </linearGradient>
                    </defs>
                    <path d="M70 24 L106 38 C106 78 70 106 70 106 C70 106 34 78 34 38 Z" fill="url(#sanctionGrad)" stroke="#71717a" stroke-width="2"/>
                    <path d="M70 32 L98 44 C98 74 70 96 70 96 C70 96 42 74 42 44 Z" fill="var(--bg-surface, #18181b)" stroke="#52525b" stroke-width="1.5"/>
                    <path d="M56 52 L84 80 M84 52 L56 80" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
                    <g>
                        <path d="M114 26 L115.5 30.5 L120 32 L115.5 33.5 L114 38 L112.5 33.5 L108 32 L112.5 30.5 Z" fill="#e4e4e7"/>
                        <path d="M24 46 L25 49 L28 50 L25 51 L24 54 L23 51 L20 50 L23 49 Z" fill="#a1a1aa"/>
                    </g>
                </svg>';

            case 'canvas':
            case 'home':
            case 'palette':
            default:
                return '<svg class="component-empty-state-svg" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="boardGrad" x1="30" y1="30" x2="110" y2="105" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="#52525b"/>
                            <stop offset="50%" stop-color="#3f3f46"/>
                            <stop offset="100%" stop-color="#27272a"/>
                        </linearGradient>
                        <linearGradient id="brushHandle" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#a1a1aa"/>
                            <stop offset="100%" stop-color="#52525b"/>
                        </linearGradient>
                    </defs>
                    <path d="M42 60 L30 124 M98 60 L110 124 M70 50 L70 124" stroke="var(--text-tertiary, #52525b)" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
                    <rect x="34" y="34" width="72" height="64" rx="10" fill="url(#boardGrad)" stroke="#52525b" stroke-width="1.5"/>
                    <rect x="39" y="39" width="62" height="54" rx="7" fill="var(--bg-surface, #18181b)"/>
                    <rect x="46" y="46" width="10" height="10" rx="2" fill="#71717a"/>
                    <rect x="58" y="46" width="10" height="10" rx="2" fill="#a1a1aa"/>
                    <rect x="70" y="46" width="10" height="10" rx="2" fill="#52525b"/>
                    <rect x="82" y="46" width="10" height="10" rx="2" fill="#3f3f46"/>
                    <rect x="46" y="58" width="10" height="10" rx="2" fill="#d4d4d8"/>
                    <rect x="58" y="58" width="10" height="10" rx="2" fill="#71717a"/>
                    <rect x="70" y="58" width="10" height="10" rx="2" fill="#e4e4e7"/>
                    <rect x="82" y="58" width="10" height="10" rx="2" fill="#52525b"/>
                    <rect x="46" y="70" width="10" height="10" rx="2" fill="#3f3f46"/>
                    <rect x="58" y="70" width="10" height="10" rx="2" fill="#52525b"/>
                    <rect x="70" y="70" width="10" height="10" rx="2" fill="#a1a1aa"/>
                    <rect x="82" y="70" width="10" height="10" rx="2" fill="#71717a"/>
                    <g transform="rotate(32 94 40)">
                        <rect x="88" y="16" width="6" height="42" rx="3" fill="url(#brushHandle)"/>
                        <rect x="87" y="54" width="8" height="6" rx="1.5" fill="#e4e4e7"/>
                        <path d="M87 60 C87 66 95 66 95 60 Z" fill="#71717a"/>
                    </g>
                    <g>
                        <path d="M112 30 L113.5 34.5 L118 36 L113.5 37.5 L112 42 L110.5 37.5 L106 36 L110.5 34.5 Z" fill="#e4e4e7"/>
                        <path d="M26 48 L27 51 L30 52 L27 53 L26 56 L25 53 L22 52 L25 51 Z" fill="#a1a1aa"/>
                        <path d="M102 96 L103 98 L105 99 L103 100 L102 102 L101 100 L99 99 L101 98 Z" fill="#71717a"/>
                    </g>
                </svg>';
        }
    }

    public static function renderEmptyState(array $options): string {
        $type = $options['type'] ?? 'canvas';
        $title = $options['title'] ?? '';
        $message = $options['message'] ?? ($options['desc'] ?? '');
        $actions = $options['actions'] ?? '';
        $ref = !empty($options['ref']) ? ' data-ref="' . htmlspecialchars($options['ref']) . '"' : '';
        $extraClass = !empty($options['class']) ? ' ' . htmlspecialchars($options['class']) : '';

        $svg = self::getEmptyGraphicSvg($type);

        $html = '<div class="component-empty-state' . $extraClass . '"' . $ref . '>';
        $html .= '<div class="component-empty-state-graphic">' . $svg . '</div>';
        if (!empty($title)) {
            $html .= '<h2 class="component-empty-state-title">' . htmlspecialchars($title) . '</h2>';
        }
        if (!empty($message)) {
            $html .= '<p class="component-empty-state-desc">' . htmlspecialchars($message) . '</p>';
        }
        if (!empty($actions)) {
            $html .= '<div class="component-empty-state-actions">' . $actions . '</div>';
        }
        $html .= '</div>';
        return $html;
    }
}