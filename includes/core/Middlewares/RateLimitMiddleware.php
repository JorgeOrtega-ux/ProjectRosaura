<?php
// includes/core/Middlewares/RateLimitMiddleware.php

namespace App\Core\Middlewares;

use App\Core\Interfaces\MiddlewareInterface;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\System\Logger;
use App\Core\Helpers\Utils;
use App\Core\System\RateLimitConstants as RL;
use App\Core\System\CacheConstants as CacheConst;

class RateLimitMiddleware implements MiddlewareInterface {
    private RateLimiterInterface $rateLimiter;

    public function __construct(RateLimiterInterface $rateLimiter) {
        $this->rateLimiter = $rateLimiter;
    }

    public function handle(array $input, array $params = []): bool {
        // Leemos los parámetros con sus respectivos fallbacks desde la fuente de verdad
        $actionPrefix = $params['key'] ?? RL::KEY_DEFAULT_RATE_LIMIT;
        $maxAttempts = $params['max'] ?? RL::DEFAULT_MAX_ATTEMPTS;
        $decayMinutes = $params['time'] ?? RL::DEFAULT_DECAY_MINUTES;
        $identifierType = $params['identifier'] ?? RL::ID_IP;

        // Determinar quién es el usuario
        $identifier = Utils::getIpAddress(); 

        if ($identifierType === RL::ID_IP_AND_EMAIL) {
            // Nota: Se ha cambiado el string mágico 'guest' por RL::ID_GUEST
            $emailOrUser = $input['email'] ?? $input['username'] ?? RL::ID_GUEST;
            $identifier .= '|' . strtolower(trim($emailOrUser));
        } elseif ($identifierType === RL::ID_USER_ID) {
            // CORRECCIÓN FALLA 8: MULTI-ACCOUNT RATE LIMIT BYPASS
            $sessionId = session_id();
            $identifier = !empty($sessionId) ? $sessionId : Utils::getIpAddress();
        }

        // Ciframos el objetivo final y armamos la llave usando la constante de Redis
        $safeTarget = md5($identifier);
        $redisKey = CacheConst::PREFIX_RATE_LIMIT . "{$actionPrefix}:{$safeTarget}";

        // Ejecutamos la evaluación y el registro
        $limitCheck = $this->rateLimiter->consume($redisKey, $maxAttempts, $decayMinutes);

        if (!$limitCheck['allowed']) {
            Logger::security("Rate limit excedido por middleware", 'warning', [
                'action' => $actionPrefix,
                'identifier' => $identifier, // Rastro del identificador real para auditoría
                'redis_key' => $redisKey
            ]);
            
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'message_key' => $limitCheck['message_key'] ?? 'error.too_many_requests'
            ]);
            return false; // El pipeline se detiene aquí
        }

        return true; // Luz verde
    }
}
?>