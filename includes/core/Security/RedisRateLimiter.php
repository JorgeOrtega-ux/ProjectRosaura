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

    /**
     * Consume un intento del Rate Limiter.
     * @param string $key Identificador único en Redis
     * @param int $maxAttempts Intentos máximos permitidos
     * @param int $lockoutMinutes Minutos de bloqueo
     * @param bool $isCritical Define si aplicar Fall-Closed ante fallos de Redis
     * @return array
     */
    public function consume(string $key, int $maxAttempts, int $lockoutMinutes, bool $isCritical = false): array {
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
            Logger::error("Redis Rate Limiter consume failed", [
                'key' => $key, 
                'is_critical' => $isCritical,
                'exception' => $e
            ]);
            
            // IMPLEMENTACIÓN DEL FAIL-CLOSED CONTEXTUAL
            if ($isCritical) {
                // Rutas críticas de autenticación fallan cerradas para evitar fuerza bruta si cae Redis
                return ['allowed' => false, 'message_key' => 'error.system_unavailable'];
            }
            
            // Failing Open: Permite el acceso solo para navegación general no crítica
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