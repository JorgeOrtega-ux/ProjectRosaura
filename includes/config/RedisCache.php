<?php
// includes/config/RedisCache.php

namespace App\Config;

use Predis\Client;
use Exception;
use App\Core\System\Logger;

class RedisCache {
    private $client;

    public function __construct() {
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
            $this->client->ping();
        } catch (Exception $e) {
            Logger::database("Error de conexión a Redis: " . $e->getMessage(), 'error');
            die(json_encode(['success' => false, 'message' => 'Ocurrió un error de conexión con la caché del servidor.']));
        }
    }

    public function getClient() {
        return $this->client;
    }

    public function get(string $key): ?string {
        if (!$this->client) return null;
        try {
            return $this->client->get($key);
        } catch (Exception $e) {
            return null;
        }
    }

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

    public function delete(string $key): bool {
        if (!$this->client) return false;
        try {
            $this->client->del($key);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    // --- MÉTODOS PARA VISITAS EN TIEMPO REAL ---
    public function incrementVideoView(int $videoId): int {
        if (!$this->client) return 0;
        try {
            return $this->client->incr("video:views:{$videoId}");
        } catch (Exception $e) {
            return 0;
        }
    }

    public function getPendingViews(int $videoId): int {
        if (!$this->client) return 0;
        try {
            return (int) $this->client->get("video:views:{$videoId}");
        } catch (Exception $e) {
            return 0;
        }
    }

    // --- NUEVO MÉTODO PARA HEATMAP (HINCRBY) ---
    public function hashIncrement(string $key, string $field, int $increment = 1): int {
        if (!$this->client) return 0;
        try {
            return $this->client->hincrby($key, $field, $increment);
        } catch (Exception $e) {
            return 0;
        }
    }
}
?>