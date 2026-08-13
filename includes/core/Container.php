<?php
namespace App\Core;

use Psr\Container\ContainerInterface;
use Exception;
use ReflectionClass;
use ReflectionNamedType;
use Predis\Client;
use App\Config\Database\DatabaseManager; 
use App\Config\Database\RedisCache;
use App\Core\Security\RedisRateLimiter;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\System\UserPrefsManager;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\System\SessionManager;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Repositories\UserRepository;
use App\Core\Interfaces\UserRepositoryInterface;
use App\Core\Repositories\TokenRepository;
use App\Core\Interfaces\TokenRepositoryInterface;
use App\Core\Repositories\RedisVerificationCodeRepository;
use App\Core\Interfaces\VerificationCodeRepositoryInterface;
use App\Core\Repositories\ProfileLogRepository;
use App\Core\Interfaces\ProfileLogRepositoryInterface;
use App\Core\Repositories\ServerConfigRepository;
use App\Core\Interfaces\ServerConfigRepositoryInterface;
use App\Core\Repositories\ModerationRepository;
use App\Core\Interfaces\ModerationRepositoryInterface;
use App\Core\Repositories\RoleRepository;
use App\Core\Interfaces\RoleRepositoryInterface;
use App\Core\Interfaces\TelemetryRepositoryInterface;
use App\Core\Repositories\TelemetryRepository;
use App\Core\Interfaces\CanvasRepositoryInterface;
use App\Core\Repositories\CanvasRepository;

use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\Repositories\SubscriptionRepository;
use App\Core\Interfaces\StoreRepositoryInterface;
use App\Core\Repositories\StoreRepository;
use App\Core\Interfaces\PaletteRepositoryInterface;
use App\Core\Repositories\PaletteRepository;
use App\Core\Interfaces\SupportRepositoryInterface;
use App\Core\Repositories\SupportRepository;

class Container implements ContainerInterface {
    private $instances = [];
    private $bindings = [];
    private $resolving = [];

    public function __construct() {
        $db = new DatabaseManager(); 
        $this->instances[DatabaseManager::class] = $db; 
        
        $redis = new RedisCache();
        $this->instances[Client::class] = $redis->getClient();
        $this->instances[RedisCache::class] = $redis;
        
        $cassandra = new \App\Config\Database\CassandraManager();
        $this->instances[\App\Config\Database\CassandraManager::class] = $cassandra;
        
        $this->bindings[RateLimiterInterface::class] = RedisRateLimiter::class; 
        
        $this->bindings[UserPrefsManagerInterface::class] = UserPrefsManager::class;
        $this->bindings[SessionManagerInterface::class] = SessionManager::class;
        $this->bindings[UserRepositoryInterface::class] = UserRepository::class;
        
        $this->bindings[TokenRepositoryInterface::class] = TokenRepository::class;
        $this->bindings[VerificationCodeRepositoryInterface::class] = RedisVerificationCodeRepository::class; 
        $this->bindings[ProfileLogRepositoryInterface::class] = ProfileLogRepository::class;
        $this->bindings[ServerConfigRepositoryInterface::class] = ServerConfigRepository::class;
        $this->bindings[ModerationRepositoryInterface::class] = ModerationRepository::class;
        $this->bindings[RoleRepositoryInterface::class] = RoleRepository::class;
        
        $this->bindings[TelemetryRepositoryInterface::class] = TelemetryRepository::class;
        $this->bindings[CanvasRepositoryInterface::class] = CanvasRepository::class;
        $this->bindings[SubscriptionRepositoryInterface::class] = SubscriptionRepository::class;
        $this->bindings[StoreRepositoryInterface::class] = StoreRepository::class;
        $this->bindings[PaletteRepositoryInterface::class] = PaletteRepository::class;
        $this->bindings[SupportRepositoryInterface::class] = SupportRepository::class;
    }

    public function get(string $id) {
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }

        $concrete = $this->bindings[$id] ?? $id;
        
        if (isset($this->resolving[$concrete])) {
            throw new Exception("Dependencia circular detectada al intentar resolver: {$concrete}");
        }

        $this->resolving[$concrete] = true;
        $resolved = $this->resolve($concrete);
        unset($this->resolving[$concrete]);
        
        $this->instances[$id] = $resolved;
        if ($concrete !== $id) {
            $this->instances[$concrete] = $resolved;
        }

        return $resolved;
    }

    public function has(string $id): bool {
        return isset($this->instances[$id]) || isset($this->bindings[$id]) || class_exists($id);
    }

    private function resolve($className) {
        try {
            $reflection = new ReflectionClass($className);
        } catch (\ReflectionException $e) {
            throw new Exception("Container error: Could not reflect {$className}");
        }

        if (!$reflection->isInstantiable()) {
            throw new Exception("Class {$className} is not instantiable.");
        }

        $constructor = $reflection->getConstructor();

        if (is_null($constructor)) {
            return new $className;
        }

        $parameters = $constructor->getParameters();
        $dependencies = array_map(function($param) use ($className) {
            $type = $param->getType();
            
            if (!$type) {
                throw new Exception("Error in {$className}: Parameter \${$param->getName()} has no defined type.");
            }
            
            if ($type instanceof ReflectionNamedType && $type->isBuiltin()) {
                if ($param->isDefaultValueAvailable()) {
                    return $param->getDefaultValue();
                }
                throw new Exception("Error in {$className}: Cannot auto-inject primitive parameter \${$param->getName()}.");
            }
            
            return $this->get($type->getName());
        }, $parameters);

        return $reflection->newInstanceArgs($dependencies);
    }
}