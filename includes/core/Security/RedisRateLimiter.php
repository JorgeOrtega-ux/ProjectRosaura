<?php
// includes/core/Security/RedisRateLimiter.php

namespace App\Core\Security;

use App\Core\Interfaces\RateLimiterInterface;
use App\Core\Helpers\Utils;
use Predis\Client;

class RedisRateLimiter implements RateLimiterInterface {
    private $redis;

    // --- CONFIGURACIONES ESPECÍFICAS DE LIMITES ---
    // 5 suscripciones por minuto (evita bots)
    const LIMIT_SUBSCRIPTIONS_ATTEMPTS = 5;
    const LIMIT_SUBSCRIPTIONS_MINUTES = 1;

    // 20 likes/dislikes por minuto (evita jugar con los botones)
    const LIMIT_LIKES_ATTEMPTS = 20;
    const LIMIT_LIKES_MINUTES = 1;

    // 1 visita por video por IP cada 5 minutos (evita refrescar compulsivamente para subir visitas artificiales)
    const LIMIT_VIEWS_ATTEMPTS = 1;
    const LIMIT_VIEWS_MINUTES = 5;

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
            
            // Si el límite es menor a un minuto, mostramos segundos
            if ($lockoutMinutes <= 1) {
                 $msg = $customMsg ? str_replace('{minutes}', 'unos momentos', $customMsg) : "Demasiados intentos. Por favor espera unos momentos e inténtalo de nuevo.";
            } else {
                 $msg = $customMsg ? str_replace('{minutes}', $remainingMinutes, $customMsg) : "Demasiados intentos. Por seguridad, por favor espera {$remainingMinutes} minutos e inténtalo de nuevo.";
            }
            
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
            // El TTL de redis es en segundos
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