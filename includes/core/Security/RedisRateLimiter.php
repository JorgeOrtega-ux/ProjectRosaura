<?php
// includes/core/Security/RedisRateLimiter.php

namespace App\Core\Security;

use App\Core\Interfaces\RateLimiterInterface;
use App\Core\System\Logger;
use Predis\Client;
use Exception;

class RedisRateLimiter implements RateLimiterInterface {
    private Client $redis;

    public function __construct(Client $redis) {
        $this->redis = $redis;
    }

    public function consume(string $key, int $maxAttempts, int $lockoutMinutes): array {
        try {
            // Script de Lua para operación atómica (Race Condition resuelta)
            // Lógica de "Fixed Window" para evitar el efecto Tarpit permanente.
            $luaScript = "
                local current = redis.call('GET', KEYS[1])
                if current and tonumber(current) >= tonumber(ARGV[1]) then
                    return 0 -- Bloqueado (Límite excedido)
                end
                
                current = redis.call('INCR', KEYS[1])
                
                -- Solo establecemos el TTL en el primer intento para no crear un Tarpit infinito
                if tonumber(current) == 1 then
                    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
                end
                
                return 1 -- Permitido
            ";

            // ARGV[1] = $maxAttempts
            // ARGV[2] = $lockoutMinutes convertidos a segundos
            $lockoutSeconds = $lockoutMinutes * 60;

            $result = $this->redis->eval($luaScript, 1, $key, $maxAttempts, $lockoutSeconds);

            if ($result === 0) {
                return ['allowed' => false, 'message_key' => 'error.rate_limit_exceeded'];
            }

            return ['allowed' => true];

        } catch (Exception $e) {
            // Failing Open: En caso de que Redis esté caído temporalmente, permitimos pasar 
            // la petición para no bloquear todo el sistema, pero registramos el error crítico.
            Logger::error("Redis Rate Limiter consume failed (Failing Open)", ['key' => $key, 'exception' => $e]);
            return ['allowed' => true];
        }
    }

    public function clear(string $key): void {
        try {
            $this->redis->del($key);
        } catch (Exception $e) {
            Logger::error("Redis Rate Limiter clear failed", ['key' => $key, 'exception' => $e]);
        }
    }
}
?>