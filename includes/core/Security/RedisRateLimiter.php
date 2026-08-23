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
                local key = KEYS[1]
                local max_attempts = tonumber(ARGV[1])
                local window_ms = tonumber(ARGV[2])
                local now_ms = tonumber(ARGV[3])
                local member = ARGV[4]

                local clear_before = now_ms - window_ms

                -- 1. Remove expired requests outside the sliding window
                redis.call('ZREMRANGEBYSCORE', key, '-inf', clear_before)

                -- 2. Count requests in the active sliding window
                local current_count = redis.call('ZCARD', key)

                -- 3. Check if threshold is exceeded
                if current_count >= max_attempts then
                    return 0
                end

                -- 4. Record the current request with its timestamp score
                redis.call('ZADD', key, now_ms, member)

                -- 5. Refresh TTL on the sorted set
                local ttl_seconds = math.max(math.ceil(window_ms / 1000), 1)
                redis.call('EXPIRE', key, ttl_seconds)

                return 1
            ";

            $nowMs = (int)round(microtime(true) * 1000);
            $windowMs = (int)($lockoutMinutes * 60 * 1000);
            $uniqueMember = $nowMs . ':' . bin2hex(random_bytes(6));

            $result = $this->redis->eval($luaScript, 1, $key, $maxAttempts, $windowMs, $nowMs, $uniqueMember);

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