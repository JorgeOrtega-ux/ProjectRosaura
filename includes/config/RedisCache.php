<?php
// includes/config/RedisCache.php

namespace App\Config;

use Predis\Client;
use Exception;
use App\Core\System\Logger;

class RedisCache {
    private $client;

    public function __construct() {
        // Cargar variables de entorno desde el archivo .env usando la raíz absoluta
        $this->loadEnv(ROOT_PATH . '/.env');

        // Leer credenciales del entorno o usar valores por defecto
        $host = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
        $port = $_ENV['REDIS_PORT'] ?? 6379;
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
            Logger::database("Error de conexión a Redis: " . $e->getMessage(), 'error');
            die(json_encode(['success' => false, 'message' => 'Ocurrió un error de conexión con la caché del servidor.']));
        }
    }

    /**
     * Retorna la instancia de conexión Predis
     * @return Client
     */
    public function getClient() {
        return $this->client;
    }

    /**
     * Obtiene un valor de la caché
     * @param string $key
     * @return string|null
     */
    public function get(string $key): ?string {
        if (!$this->client) return null;
        try {
            return $this->client->get($key);
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Guarda un valor en la caché con tiempo de expiración opcional
     * @param string $key
     * @param string $value
     * @param int|null $ttl Segundos (Opcional)
     * @return bool
     */
    public function set(string $key, string $value, ?int $ttl = null): bool {
        if (!$this->client) return false;
        try {
            if ($ttl) {
                $this->client->setex($key, $ttl, $value);
            } else {
                $this->client->set($key, $value);
            }
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Elimina una clave de la caché
     * @param string $key
     * @return bool
     */
    public function delete(string $key): bool {
        if (!$this->client) return false;
        try {
            $this->client->del($key);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Función interna y ligera para parsear el archivo .env
     */
    private function loadEnv($path) {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);

            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                putenv(sprintf('%s=%s', $name, $value));
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}
?>