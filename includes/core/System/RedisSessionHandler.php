<?php
// includes/core/System/RedisSessionHandler.php

namespace App\Core\System;

use SessionHandlerInterface;
use Predis\Client;
use Exception;
use App\Core\System\Logger;
use App\Core\System\CacheConstants;

class RedisSessionHandler implements SessionHandlerInterface {
    private $redis;
    private $prefix;
    private $ttl;

    public function __construct(Client $redis, string $prefix = CacheConstants::PREFIX_PHPSESSID, int $ttl = CacheConstants::TTL_ONE_DAY) {
        $this->redis = $redis;
        $this->prefix = $prefix;
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
        try {
            $data = $this->redis->get($this->prefix . $id);
            return $data === null ? '' : $data;
        } catch (Exception $e) {
            Logger::error("Redis session read failed", ['session_id' => $id, 'exception' => $e]);
            return '';
        }
    }

    #[\ReturnTypeWillChange]
    public function write($id, $data) {
        try {
            $this->redis->setex($this->prefix . $id, $this->ttl, $data);

            // ================================================================
            // ÍNDICES SECUNDARIOS PARA PURGA DE SESIONES FANTASMA (STALE SESSIONS)
            // ================================================================
            $sessionArray = $this->parseSessionData($data);

            if (isset($sessionArray['accounts']) && is_array($sessionArray['accounts'])) {
                foreach ($sessionArray['accounts'] as $accountId => $accountData) {
                    
                    // Indexar cada cuenta en el pool a este PHPSESSID
                    $idxKey = CacheConstants::PREFIX_USER_SESSIONS . $accountId;
                    $this->redis->sadd($idxKey, $id);
                    $this->redis->expire($idxKey, $this->ttl);
                    
                    // Indexar cada rol que posee la cuenta a este PHPSESSID
                    if (isset($accountData['user_roles']) && is_array($accountData['user_roles'])) {
                        foreach ($accountData['user_roles'] as $roleId) {
                            $this->redis->sadd("idx:role_sessions:{$roleId}", $id);
                            $this->redis->expire("idx:role_sessions:{$roleId}", $this->ttl);
                        }
                    }
                }
            }

            return true;
        } catch (Exception $e) {
            Logger::error("Redis session write failed", ['session_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    #[\ReturnTypeWillChange]
    public function destroy($id) {
        try {
            $this->redis->del($this->prefix . $id);
            return true;
        } catch (Exception $e) {
            Logger::error("Redis session destroy failed", ['session_id' => $id, 'exception' => $e]);
            return false;
        }
    }

    #[\ReturnTypeWillChange]
    public function gc($max_lifetime) {
        return true;
    }

    /**
     * Decodifica la sesión de forma segura sin interferir con $_SESSION en memoria
     */
    private function parseSessionData(string $session_data): array {
        $return_data = [];
        $offset = 0;
        $length = strlen($session_data);

        while ($offset < $length) {
            $pos = strpos($session_data, "|", $offset);
            if ($pos === false) {
                break; // Formato inválido o fin
            }
            $num = $pos - $offset;
            $varname = substr($session_data, $offset, $num);
            $offset += $num + 1;

            $str = substr($session_data, $offset);
            $data = @unserialize($str);
            $return_data[$varname] = $data;

            $offset += strlen(serialize($data));
        }

        return $return_data;
    }
}
?>