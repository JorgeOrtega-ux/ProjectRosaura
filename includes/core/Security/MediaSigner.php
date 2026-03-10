<?php
// includes/core/Security/MediaSigner.php

namespace App\Core\Security;

use App\Core\Interfaces\MediaSignerInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;

class MediaSigner implements MediaSignerInterface {
    private $secretKey;

    public function __construct(ServerConfigRepositoryInterface $configRepo) {
        $config = $configRepo->getConfig();
        // Se utiliza una clave maestra definida en la base de datos o un fallback seguro.
        $this->secretKey = $config['media_signature_secret'] ?? $_ENV['MEDIA_SECRET'] ?? 'default_rosaura_media_secret_2026';
    }

    public function generateToken(string $videoUuid, int $expires, string $ipAddress): string {
        // Concatenamos los datos vitales para generar la firma
        $payload = "{$videoUuid}|{$expires}|{$ipAddress}";
        
        // Usamos HMAC con SHA-256 para máxima seguridad y velocidad
        return hash_hmac('sha256', $payload, $this->secretKey);
    }

    public function validateToken(string $videoUuid, int $expires, string $ipAddress, string $providedToken): bool {
        // 1. Validar que no haya expirado
        if (time() > $expires) {
            return false;
        }

        // 2. Re-generar el token con los datos actuales
        $expectedToken = $this->generateToken($videoUuid, $expires, $ipAddress);

        // 3. Comparación segura contra ataques de tiempo (timing attacks)
        return hash_equals($expectedToken, $providedToken);
    }
}
?>