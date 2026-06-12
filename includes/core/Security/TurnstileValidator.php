<?php
// includes/core/Security/TurnstileValidator.php

namespace App\Core\Security;

use App\Core\Helpers\EnvLoader;

class TurnstileValidator {
    private string $secretKey;
    private string $endpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function __construct() {
        // Obtenemos la clave secreta desde el entorno
        $this->secretKey = EnvLoader::get('TURNSTILE_SECRET_KEY', '');
    }

    /**
     * Valida el token proporcionado por el frontend contra la API de Cloudflare.
     *
     * @param string|null $token El token cf-turnstile-response
     * @param string|null $remoteIp (Opcional) IP del usuario para mayor precisión
     * @return bool True si es válido, False si es inválido o hay error.
     */
    public function isValid(?string $token, ?string $remoteIp = null): bool {
        if (empty($token) || empty($this->secretKey)) {
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
        
        // Ejecutar petición
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || $response === false) {
            return false; // Falla segura: si Cloudflare cae, tú decides si permitir o bloquear. Por seguridad, bloqueamos.
        }

        $result = json_decode($response, true);
        
        return isset($result['success']) && $result['success'] === true;
    }
}
?>