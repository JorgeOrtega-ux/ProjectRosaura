<?php
// includes/config/RedisCache.php

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
            $this->client->ping(); // Probar conexión
        } catch (Exception $e) {
            Logger::database("Connection error to Redis: " . $e->getMessage(), 'error');
            $this->setupDummyClient();
        }
    }

    private function setupDummyClient() {
        // CLIENTE FANTASMA (Dummy Client)
        // Crea un objeto anónimo que absorbe cualquier petición (get, set, exists) y devuelve null.
        // Esto permite que el sistema asuma que la caché está vacía y use archivos locales sin colapsar.
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
            Logger::database("Error flushing Redis database: " . $e->getMessage(), 'error');
            return false;
        }
    }

    // ==========================================
    // DISTRIBUTED LOCKS (MUTEX) PARA CONDICIONES DE CARRERA
    // ==========================================

    /**
     * Adquiere un bloqueo distribuido en Redis para operaciones críticas
     */
    public function acquireLock(string $name, int $timeoutSeconds = 5) {
        // Si el sistema está degradado, dejamos pasar en memoria local
        if (!$this->client || defined('SYSTEM_DEGRADED')) {
            return bin2hex(random_bytes(16)); 
        }

        try {
            $token = bin2hex(random_bytes(16));
            // SetNX: Establece la llave solo si NO existe, con caducidad para evitar deadlocks
            $result = $this->client->set("lock:{$name}", $token, 'EX', $timeoutSeconds, 'NX');
            
            if ($result) {
                return $token; // Lock adquirido con éxito
            }
        } catch (Exception $e) {
            Logger::error("Redis acquireLock failed for: {$name}", ['exception' => $e]);
        }
        
        return false;
    }

    /**
     * Libera de forma segura un bloqueo distribuido (Operación Atómica usando Lua)
     */
    public function releaseLock(string $name, string $token): bool {
        if (!$this->client || defined('SYSTEM_DEGRADED')) {
            return true;
        }

        try {
            // Script de Lua para asegurar que solo quien tiene el token correcto pueda borrar la llave
            $script = '
                if redis.call("GET", KEYS[1]) == ARGV[1] then
                    return redis.call("DEL", KEYS[1])
                else
                    return 0
                end
            ';
            return (bool)$this->client->eval($script, 1, "lock:{$name}", $token);
        } catch (Exception $e) {
            Logger::error("Redis releaseLock failed for: {$name}", ['exception' => $e]);
            return false;
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