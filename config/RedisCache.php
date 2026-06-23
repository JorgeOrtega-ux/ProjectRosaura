<?php
// config/RedisCache.php
namespace App\Config;

use Predis\Client;
use Exception;
use App\Core\System\Logger;
use App\Core\Helpers\EnvLoader;

class RedisCache {
    private $client;

    public function __construct() {
        $host = EnvLoader::get('REDIS_HOST', '');
        $port = (int)EnvLoader::get('REDIS_PORT', 6379);

        if (empty($host)) {
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
        } catch (Exception $e) {
            Logger::error('Redis connection failure', [
                'exception' => $e->getMessage()
            ]);
            $this->setupDummyClient();
        }
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
        if (!$this->client || defined('SYSTEM_DEGRADED')) {
            return bin2hex(random_bytes(16)); 
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
        if (!$this->client || defined('SYSTEM_DEGRADED')) {
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
            return false;
        }
    }

    public function executeWithLock(string $name, int $timeoutSeconds, callable $callback) {
        $lockToken = $this->acquireLock($name, $timeoutSeconds);
        try {
            return $callback($lockToken);
        } finally {
            if ($lockToken) {
                $this->releaseLock($name, $lockToken);
            }
        }
    }
}