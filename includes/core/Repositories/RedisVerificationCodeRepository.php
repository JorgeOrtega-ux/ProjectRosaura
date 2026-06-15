<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use App\Core\System\Logger;
use Predis\Client;

class RedisVerificationCodeRepository implements VerificationCodeRepositoryInterface {
    private $redis;

    public function __construct(Client $redis) {
        $this->redis = $redis;
    }

    public function createCode(string $identifier, string $codeType, string $code, string $payload, string $expiresAt): bool {
        try {
            $id = $this->redis->incr('seq:verification_codes');
            
            $now = time();
            $expiresTime = strtotime($expiresAt);
            $ttl = $expiresTime - $now;
            
            if ($ttl <= 0) $ttl = 900; 

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

            $this->redis->setex("vercode:id:{$id}", $ttl, $json);
            $this->redis->setex("vercode:ident:{$identifier}:{$codeType}", $ttl, $id);
            $this->redis->setex("vercode:code:{$code}:{$codeType}", $ttl, $id);

            return true;
        } catch (\Exception $e) {
            Logger::error("Redis code creation failed", ['identifier' => $identifier, 'code_type' => $codeType, 'exception' => $e->getMessage()]);
            return false;
        }
    }

    public function findLatestValidByIdentifierAndType(string $identifier, string $codeType): ?array {
        try {
            $keyIdent = "vercode:ident:{$identifier}:{$codeType}";
            $id = $this->redis->get($keyIdent);
            
            if (!$id) return null;

            $json = $this->redis->get("vercode:id:{$id}");
            if (!$json) return null;

            $data = json_decode($json, true);
            $data['seconds_elapsed'] = time() - strtotime($data['created_at']);
            return $data;
        } catch (\Exception $e) {
            Logger::error("Redis find code by identifier failed", ['identifier' => $identifier, 'code_type' => $codeType, 'exception' => $e->getMessage()]);
            return null;
        }
    }

    public function findValidByCodeAndType(string $code, string $codeType): ?array {
        try {
            $keyCode = "vercode:code:{$code}:{$codeType}";
            $id = $this->redis->get($keyCode);
            
            if (!$id) return null;

            $json = $this->redis->get("vercode:id:{$id}");
            return $json ? json_decode($json, true) : null;
        } catch (\Exception $e) {
            Logger::error("Redis find code failed", ['code_type' => $codeType, 'exception' => $e->getMessage()]);
            return null;
        }
    }

    public function hasActiveCode(string $identifier, string $codeType): bool {
        try {
            return (bool) $this->redis->exists("vercode:ident:{$identifier}:{$codeType}");
        } catch (\Exception $e) {
            Logger::error("Redis active code check failed", ['identifier' => $identifier, 'code_type' => $codeType, 'exception' => $e->getMessage()]);
            return false;
        }
    }

    public function deleteById(int $id): bool {
        try {
            $json = $this->redis->get("vercode:id:{$id}");
            if ($json) {
                $data = json_decode($json, true);
                $this->redis->del("vercode:ident:{$data['identifier']}:{$data['code_type']}");
                $this->redis->del("vercode:code:{$data['code']}:{$data['code_type']}");
                $this->redis->del("vercode:id:{$id}");
            }
            return true;
        } catch (\Exception $e) {
            Logger::error("Redis delete code by ID failed", ['id' => $id, 'exception' => $e->getMessage()]);
            return false;
        }
    }

    public function deleteByIdentifierAndType(string $identifier, string $codeType): bool {
        try {
            $keyIdent = "vercode:ident:{$identifier}:{$codeType}";
            $id = $this->redis->get($keyIdent);
            if ($id) {
                $this->deleteById((int)$id);
            }
            return true;
        } catch (\Exception $e) {
            Logger::error("Redis delete code by identifier failed", ['identifier' => $identifier, 'code_type' => $codeType, 'exception' => $e->getMessage()]);
            return false;
        }
    }
}