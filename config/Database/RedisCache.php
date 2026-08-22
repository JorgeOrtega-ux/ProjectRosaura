<?php

namespace App\Config\Database;

use Predis\Client;
use Exception;
use App\Core\System\Logger;
use App\Core\Helpers\EnvLoader;

class RedisCache {
    private static $sharedClient = null;
    private static bool $connectionAttempted = false;
    private $client;

    public function __construct(?Client $existingClient = null) {
        if ($existingClient !== null) {
            $this->client = $existingClient;
            self::$sharedClient = $existingClient;
            return;
        }

        if (self::$sharedClient !== null) {
            $this->client = self::$sharedClient;
            return;
        }

        if (self::$connectionAttempted) {
            $this->setupDummyClient();
            return;
        }

        $host = EnvLoader::get('REDIS_HOST', '');
        $port = (int)EnvLoader::get('REDIS_PORT', 6379);

        if (empty($host)) {
            self::$connectionAttempted = true;
            $this->setupDummyClient();
            return;
        }

        $pass = EnvLoader::get('REDIS_PASS', '');

        $parameters = [
            'scheme' => 'tcp',
            'host'   => $host,
            'port'   => $port,
        ];

        if (!empty($pass)) {
            $parameters['password'] = $pass;
        }

        try {
            $this->client = new Client($parameters);
            $this->client->ping();
            self::$sharedClient = $this->client;
        } catch (Exception $e) {
            self::$connectionAttempted = true;
            Logger::error('Redis connection failure', [
                'exception' => $e->getMessage()
            ]);
            $this->setupDummyClient();
        }
    }

    public static function resetSharedClient(): void {
        self::$sharedClient = null;
        self::$connectionAttempted = false;
    }

    private function setupDummyClient() {
        $this->client = new class {
            public function __call($name, $arguments) {
                return null;
            }
        };
        
        if (!defined('SYSTEM_DEGRADED')) {
            define('SYSTEM_DEGRADED', true);
        }
    }

    public function getClient() {
        return $this->client;
    }

    public function flushAll() {
        try {
            if (method_exists($this->client, 'flushdb')) {
                $this->client->flushdb();
                return true;
            }
            return false;
        } catch (Exception $e) {
            Logger::error('Redis database flush failure', [
                'exception' => $e->getMessage()
            ]);
            return false;
        }
    }

    public function acquireLock(string $name, int $timeoutSeconds = 5) {
        $isDegraded = defined('SYSTEM_DEGRADED') && constant('SYSTEM_DEGRADED') === true;
        if (!$this->client || $isDegraded) {
            return false; 
        }

        try {
            $token = bin2hex(random_bytes(16));
            $result = $this->client->set("lock:{$name}", $token, 'EX', $timeoutSeconds, 'NX');
            
            if ($result) {
                return $token;
            }
        } catch (Exception $e) {
            Logger::error('Redis acquire lock failure', [
                'lock_name' => $name, 
                'exception' => $e->getMessage()
            ]);
        }
        
        return false;
    }

    public function releaseLock(string $name, string $token): bool {
        $isDegraded = defined('SYSTEM_DEGRADED') && constant('SYSTEM_DEGRADED') === true;
        if (!$this->client || $isDegraded) {
            return true;
        }

        try {
            $script = '
                if redis.call("GET", KEYS[1]) == ARGV[1] then
                    return redis.call("DEL", KEYS[1])
                else
                    return 0
                end
            ';
            return (bool)$this->client->eval($script, 1, "lock:{$name}", $token);
        } catch (Exception $e) {
            Logger::error('Redis release lock failure', [
                'lock_name' => $name, 
                'exception' => $e->getMessage()
            ]);
        }
        return false;
    }

    public function executeWithLock(string $name, int $timeoutSeconds, callable $callback, int $maxRetries = 10, int $retryDelayMs = 50) {
        $isDegraded = defined('SYSTEM_DEGRADED') && constant('SYSTEM_DEGRADED') === true;
        if (!$this->client || $isDegraded) {
            return $callback(null);
        }

        $lockToken = false;
        for ($i = 0; $i < $maxRetries; $i++) {
            $lockToken = $this->acquireLock($name, $timeoutSeconds);
            if ($lockToken !== false) {
                break;
            }
            usleep($retryDelayMs * 1000);
        }

        if ($lockToken === false) {
            Logger::warning('Failed to acquire distributed lock after retries', ['lock_name' => $name]);
            return ['success' => false, 'message_key' => 'error.system_busy'];
        }

        try {
            return $callback($lockToken);
        } finally {
            if ($lockToken) {
                $this->releaseLock($name, $lockToken);
            }
        }
    }
}