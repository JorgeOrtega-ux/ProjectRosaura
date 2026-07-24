<?php

namespace App\Core\Security;

use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;

class GoogleOAuthProvider {
    /**
     * Verify Google OAuth access token or credential and return user payload or null on failure.
     *
     * @param string $credential
     * @return array|null
     */
    public static function verifyToken(string $credential): ?array {
        if (empty($credential)) {
            return null;
        }

        $clientId = EnvLoader::get('GOOGLE_CLIENT_ID', '');
        if (empty($clientId)) {
            Logger::warning("Google OAuth verification attempted without GOOGLE_CLIENT_ID set.");
            return null;
        }

        $userInfoUrl = EnvLoader::get('GOOGLE_USERINFO_URL', 'https://www.googleapis.com/oauth2/v3/userinfo');

        try {
            $ch = curl_init($userInfoUrl);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer {$credential}"
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($response === false || $httpCode !== 200) {
                Logger::error("Google OAuth API call failed", [
                    'http_code' => $httpCode,
                    'curl_error' => $curlError
                ]);
                return null;
            }

            $payload = json_decode($response, true);
            if (!is_array($payload) || empty($payload['sub'])) {
                Logger::warning("Google OAuth payload invalid or missing 'sub'", ['payload' => $payload]);
                return null;
            }

            return $payload;
        } catch (\Throwable $e) {
            Logger::error("Google OAuth token verification exception", ['exception' => $e]);
            return null;
        }
    }
}
