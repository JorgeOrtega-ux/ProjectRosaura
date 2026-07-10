<?php

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
        $actionPrefix = $params['key'] ?? RL::KEY_DEFAULT_RATE_LIMIT;
        $maxAttempts = $params['max'] ?? RL::DEFAULT_MAX_ATTEMPTS;
        $decayMinutes = $params['time'] ?? RL::DEFAULT_DECAY_MINUTES;
        $identifierType = $params['identifier'] ?? RL::ID_IP;
        $isCritical = $params['is_critical'] ?? false;
        $identifier = Utils::getIpAddress(); 

        if ($identifierType === RL::ID_IP_AND_EMAIL) {
            $emailOrUser = $input['email'] ?? $input['username'] ?? RL::ID_GUEST;
            $identifier .= '|' . strtolower(trim($emailOrUser));
        } elseif ($identifierType === RL::ID_USER_ID) {
            $sessionId = session_id();
            $identifier = !empty($sessionId) ? $sessionId : Utils::getIpAddress();
        }
        $safeTarget = md5($identifier);
        $redisKey = CacheConst::PREFIX_RATE_LIMIT . "{$actionPrefix}:{$safeTarget}";
        $limitCheck = $this->rateLimiter->consume($redisKey, $maxAttempts, $decayMinutes, $isCritical);

        if (!$limitCheck['allowed']) {
            Logger::security("Rate limit excedido por middleware o servicio no disponible", 'warning', [
                'action' => $actionPrefix,
                'identifier' => $identifier,
                'redis_key' => $redisKey,
                'is_critical' => $isCritical
            ]);
            
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'message_key' => $limitCheck['message_key'] ?? 'error.too_many_requests'
            ]);
            return false;
        }

        return true;
    }
}
?>