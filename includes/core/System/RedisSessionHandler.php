<?php
// includes/core/System/RedisSessionHandler.php

namespace App\Core\System;

use SessionHandlerInterface;
use Predis\Client;

class RedisSessionHandler implements SessionHandlerInterface {
    private $redis;
    private $prefix;
    private $ttl;

    /**
     * @param Client $redis Instancia de Predis conectada
     * @param string $prefix Prefijo para identificar las llaves de sesión en Redis
     * @param int $ttl Tiempo de vida en segundos por defecto (86400 = 1 día)
     */
    public function __construct(Client $redis, string $prefix = 'PHPSESSID:', int $ttl = 86400) {
        $this->redis = $redis;
        $this->prefix = $prefix;
        
        // Se intenta tomar el tiempo máximo de vida del php.ini, si no existe usa el default
        $this->ttl = (int)ini_get('session.gc_maxlifetime') ?: $ttl;
    }

    #[\ReturnTypeWillChange]
    public function open($path, $name) {
        return true;
    }

    #[\ReturnTypeWillChange]
    public function close() {
        return true;
    }

    #[\ReturnTypeWillChange]
    public function read($id) {
        // Obtenemos los datos de la memoria de Redis
        $data = $this->redis->get($this->prefix . $id);
        return $data === null ? '' : $data;
    }

    #[\ReturnTypeWillChange]
    public function write($id, $data) {
        // Guardamos los datos en Redis y establecemos su expiración exacta (TTL)
        $this->redis->setex($this->prefix . $id, $this->ttl, $data);
        return true;
    }

    #[\ReturnTypeWillChange]
    public function destroy($id) {
        // Borramos la sesión de Redis al instante
        $this->redis->del($this->prefix . $id);
        return true;
    }

    #[\ReturnTypeWillChange]
    public function gc($max_lifetime) {
        // Redis limpia las llaves automáticamente gracias al TTL de setex.
        // No es necesario que PHP haga recolección de basura (Garbage Collection) manual.
        return true;
    }
}
?>