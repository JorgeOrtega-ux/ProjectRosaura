<?php

namespace App\Core\Security;

use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;

class TurnstileValidator {
    private string $secretKey;
    private string $endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function __construct() {
        $this->secretKey = EnvLoader::get('TURNSTILE_SECRET_KEY', '');
    }

    public function isValid(?string $token, ?string $remoteIp = null): bool {
        if (empty($this->secretKey)) {
            Logger::warning("Turnstile validation failed: TURNSTILE_SECRET_KEY is not configured in .env");
            return false;
        }

        if (empty($token)) {
            return false;
        }

        $data = [
            'secret' => $this->secretKey,
            'response' => $token
        ];

        if ($remoteIp !== null) {
            $data['remoteip'] = $remoteIp;
        }

        $ch = curl_init($this->endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || $response === false) {
            return false;
        }

        $result = json_decode($response, true);
        
        return isset($result['success']) && $result['success'] === true;
    }
}