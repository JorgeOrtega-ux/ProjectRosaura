<?php
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

    public function consume(string $key, int $maxAttempts, int $lockoutMinutes, bool $isCritical = false): array {
        try {
            $luaScript = "
                local current = redis.call('GET', KEYS[1])
                if current and tonumber(current) >= tonumber(ARGV[1]) then
                    return 0
                end
                
                current = redis.call('INCR', KEYS[1])
                
                if tonumber(current) == 1 then
                    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
                end
                
                return 1
            ";

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
                'exception' => $e->getMessage()
            ]);
            
            if ($isCritical) {
                return ['allowed' => false, 'message_key' => 'error.system_unavailable'];
            }
            
            return ['allowed' => true];
        }
    }

    public function clear(string $key): void {
        try {
            $this->redis->del($key);
        } catch (Exception $e) {
            Logger::error("Redis Rate Limiter clear failed", ['key' => $key, 'exception' => $e->getMessage()]);
        }
    }
}