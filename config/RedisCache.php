<?php

namespace App\Config;

use Predis\Client;
use Exception;
use App\Core\System\Logger;

class RedisCache {
    private $client;

    public function __construct() {
        $this->loadEnv(ROOT_PATH . '/.env');

        if (!isset($_ENV['REDIS_HOST']) || !isset($_ENV['REDIS_PORT'])) {
            $this->setupDummyClient();
            return;
        }

        $host = $_ENV['REDIS_HOST'];
        $port = (int)$_ENV['REDIS_PORT'];
        $pass = $_ENV['REDIS_PASS'] ?? null;

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
            Logger::error('Redis connection failure.', [
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
        $client = $this->client;
        
        if (!$client) {
            return null;
        }

        return new class($client) {
            private $client;
            
            public function __construct($client) { 
                $this->client = $client; 
            }
            
            public function __call($name, $args) {
                if ($name === 'rpush' && isset($args[1]) && !is_array($args[1])) {
                    $args[1] = [$args[1]];
                }
                return $this->client->$name(...$args);
            }
        };
    }

    public function flushAll() {
        try {
            if (method_exists($this->client, 'flushdb')) {
                $this->client->flushdb();
                return true;
            }
            return false;
        } catch (Exception $e) {
            Logger::error('Redis database flush failure.', [
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
            Logger::error('Redis acquire lock failure.', [
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
            Logger::error('Redis release lock failure.', [
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

    private function loadEnv($path) {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (strpos($line, '=') === false) continue;

            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);

            if (preg_match('/^"(.*)"$/', $value, $matches) || preg_match("/^'(.*)'$/", $value, $matches)) {
                $value = $matches[1];
            }

            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                putenv(sprintf('%s=%s', $name, $value));
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}
?>