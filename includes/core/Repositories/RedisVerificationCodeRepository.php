<?php
// includes/core/Repositories/RedisVerificationCodeRepository.php

namespace App\Core\Repositories;

use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use Predis\Client;

class RedisVerificationCodeRepository implements VerificationCodeRepositoryInterface {
    private $redis;

    public function __construct(Client $redis) {
        $this->redis = $redis;
    }

    public function createCode(string $identifier, string $codeType, string $code, string $payload, string $expiresAt): bool {
        // Simulamos un ID auto-incremental único para compatibilidad con la Interfaz actual
        $id = $this->redis->incr('seq:verification_codes');
        
        $now = time();
        $expiresTime = strtotime($expiresAt);
        $ttl = $expiresTime - $now;
        
        if ($ttl <= 0) $ttl = 900; // Fallback 15 minutos por seguridad

        $data = [
            'id' => $id,
            'identifier' => $identifier,
            'code_type' => $codeType,
            'code' => $code,
            'payload' => $payload,
            'expires_at' => $expiresAt,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $json = json_encode($data);

        // 1. Registro principal (Por ID)
        $this->redis->setex("vercode:id:{$id}", $ttl, $json);

        // 2. Índice por identificador y tipo (Ej. Email + account_activation)
        $this->redis->setex("vercode:ident:{$identifier}:{$codeType}", $ttl, $id);

        // 3. Índice directo por código exacto
        $this->redis->setex("vercode:code:{$code}:{$codeType}", $ttl, $id);

        return true;
    }

    public function findLatestValidByIdentifierAndType(string $identifier, string $codeType): ?array {
        $keyIdent = "vercode:ident:{$identifier}:{$codeType}";
        $id = $this->redis->get($keyIdent);
        
        if (!$id) return null;

        $json = $this->redis->get("vercode:id:{$id}");
        if (!$json) return null;

        $data = json_decode($json, true);
        $data['seconds_elapsed'] = time() - strtotime($data['created_at']);
        return $data;
    }

    public function findValidByCodeAndType(string $code, string $codeType): ?array {
        $keyCode = "vercode:code:{$code}:{$codeType}";
        $id = $this->redis->get($keyCode);
        
        if (!$id) return null;

        $json = $this->redis->get("vercode:id:{$id}");
        return $json ? json_decode($json, true) : null;
    }

    public function hasActiveCode(string $identifier, string $codeType): bool {
        return (bool) $this->redis->exists("vercode:ident:{$identifier}:{$codeType}");
    }

    public function deleteById(int $id): bool {
        $json = $this->redis->get("vercode:id:{$id}");
        if ($json) {
            $data = json_decode($json, true);
            // Destruimos todos los índices asociados manualmente
            $this->redis->del("vercode:ident:{$data['identifier']}:{$data['code_type']}");
            $this->redis->del("vercode:code:{$data['code']}:{$data['code_type']}");
            $this->redis->del("vercode:id:{$id}");
        }
        return true;
    }

    public function deleteByIdentifierAndType(string $identifier, string $codeType): bool {
        $keyIdent = "vercode:ident:{$identifier}:{$codeType}";
        $id = $this->redis->get($keyIdent);
        if ($id) {
            $this->deleteById((int)$id);
        }
        return true;
    }
}
?>