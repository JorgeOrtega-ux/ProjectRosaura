<?php
// includes/core/Security/MediaSigner.php

namespace App\Core\Security;

use App\Core\Interfaces\MediaSignerInterface;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use Exception;

class MediaSigner implements MediaSignerInterface {
    private $secretKey;

    public function __construct(ServerConfigRepositoryInterface $configRepo) {
        $config = $configRepo->getConfig();
        
        $secret = $config['media_signature_secret'] ?? $_ENV['MEDIA_SECRET'] ?? null;
        
        if (empty($secret)) {
            // Falla de manera segura: No permitimos instanciar la clase sin una clave real.
            throw new Exception("Configuración de seguridad crítica faltante: MEDIA_SECRET no está definido.");
        }
        
        $this->secretKey = $secret;
    }

    public function generateToken(string $videoUuid, int $expires, string $ipAddress): string {
        $payload = "{$videoUuid}|{$expires}|{$ipAddress}";
        return hash_hmac('sha256', $payload, $this->secretKey);
    }

    public function validateToken(string $videoUuid, int $expires, string $ipAddress, string $providedToken): bool {
        if (time() > $expires) {
            return false;
        }

        $expectedToken = $this->generateToken($videoUuid, $expires, $ipAddress);

        return hash_equals($expectedToken, $providedToken);
    }
}
?>