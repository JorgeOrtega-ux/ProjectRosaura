<?php

namespace App\Core\Security;

use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;

class GoogleOAuthProvider {
    public static function verifyToken(string $credential): ?array {
        if (empty($credential)) {
            return null;
        }

        $clientId = EnvLoader::get('GOOGLE_CLIENT_ID', '');
        if (empty($clientId)) {
            Logger::warning("Google OAuth verification attempted without GOOGLE_CLIENT_ID set.");
            return null;
        }

        try {
            $isJwt = substr_count($credential, '.') === 2;

            if ($isJwt) {
                $endpoint = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential);
                $ch = curl_init($endpoint);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                curl_close($ch);

                if ($response === false || $httpCode !== 200) {
                    Logger::error("Google OAuth ID token verification failed", [
                        'http_code' => $httpCode,
                        'curl_error' => $curlError
                    ]);
                    return null;
                }

                $payload = json_decode($response, true);
                if (!is_array($payload) || empty($payload['sub']) || empty($payload['email'])) {
                    Logger::warning("Google OAuth payload invalid", ['payload' => $payload]);
                    return null;
                }

                $tokenAud = $payload['aud'] ?? '';
                $tokenAzp = $payload['azp'] ?? '';
                if ($tokenAud !== $clientId && $tokenAzp !== $clientId) {
                    Logger::security("Google OAuth token audience mismatch", 'warning', [
                        'expected' => $clientId,
                        'received_aud' => $tokenAud,
                        'received_azp' => $tokenAzp
                    ]);
                    return null;
                }

                if (isset($payload['email_verified']) && $payload['email_verified'] !== true && $payload['email_verified'] !== 'true' && $payload['email_verified'] !== 1 && $payload['email_verified'] !== '1') {
                    Logger::warning("Google OAuth email not verified", ['email' => $payload['email']]);
                    return null;
                }

                return $payload;
            }

            $userInfoUrl = EnvLoader::get('GOOGLE_USERINFO_URL', 'https://www.googleapis.com/oauth2/v3/userinfo');
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
            if (!is_array($payload) || empty($payload['sub']) || empty($payload['email'])) {
                Logger::warning("Google OAuth payload invalid or missing 'sub'", ['payload' => $payload]);
                return null;
            }

            $tokenInfoUrl = 'https://oauth2.googleapis.com/tokeninfo?access_token=' . urlencode($credential);
            $chInfo = curl_init($tokenInfoUrl);
            curl_setopt($chInfo, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chInfo, CURLOPT_TIMEOUT, 10);
            curl_setopt($chInfo, CURLOPT_SSL_VERIFYPEER, true);
            $tokenInfoResp = curl_exec($chInfo);
            $tokenInfoCode = curl_getinfo($chInfo, CURLINFO_HTTP_CODE);
            curl_close($chInfo);

            if ($tokenInfoResp !== false && $tokenInfoCode === 200) {
                $tokenInfo = json_decode($tokenInfoResp, true);
                if (is_array($tokenInfo)) {
                    $aud = $tokenInfo['aud'] ?? ($tokenInfo['azp'] ?? '');
                    if ($aud !== $clientId) {
                        Logger::security("Google OAuth access token audience mismatch", 'warning', [
                            'expected' => $clientId,
                            'received' => $aud
                        ]);
                        return null;
                    }
                }
            }

            return $payload;
        } catch (\Throwable $e) {
            Logger::error("Google OAuth token verification exception", ['exception' => $e]);
            return null;
        }
    }
}
