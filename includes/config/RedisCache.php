<?php
// includes/config/RedisCache.php

namespace App\Config;

use Predis\Client;
use Exception;
use App\Core\System\Logger;

class RedisCache {
    private $client;

    public function __construct() {
        // Cargar variables de entorno desde el archivo .env en la raíz
        $this->loadEnv(__DIR__ . '/../../.env');

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