<?php
// includes/core/Security/RedisRateLimiter.php

namespace App\Core\Security;

use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Helpers\Utils;
use Predis\Client;

class RedisRateLimiter implements RateLimiterInterface {
    private $redis;

    public function __construct(Client $redis) {
        $this->redis = $redis;
    }

    public function check($action, $maxAttempts, $lockoutMinutes, $customMsg = null) {
        $ip = Utils::getIpAddress();
        $key = "rate_limit:{$action}:{$ip}";

        $attempts = (int) $this->redis->get($key);

        if ($attempts >= $maxAttempts) {
            $ttl = $this->redis->ttl($key);
            $remainingMinutes = ceil($ttl / 60);
            $msg = $customMsg ? str_replace('{minutes}', $remainingMinutes, $customMsg) : "Demasiados intentos. Por seguridad, por favor espera {$remainingMinutes} minutos e inténtalo de nuevo.";
            return ['allowed' => false, 'message' => $msg];
        }

        return ['allowed' => true];
    }

    public function record($action, $maxAttempts, $lockoutMinutes) {
        $ip = Utils::getIpAddress();
        $key = "rate_limit:{$action}:{$ip}";

        $attempts = $this->redis->incr($key);
        
        // Si es el primer intento, o si alcanzó el máximo (aseguramos el TTL de baneo)
        if ($attempts == 1 || $attempts >= $maxAttempts) {
            $this->redis->expire($key, $lockoutMinutes * 60);
        }
    }

    public function clear($action) {
        $ip = Utils::getIpAddress();
        $key = "rate_limit:{$action}:{$ip}";
        $this->redis->del($key);
    }
}
?>