<?php
// includes/core/Container.php

namespace App\Core;

use Psr\Container\ContainerInterface;
use Exception;
use ReflectionClass;
use ReflectionNamedType;
use Predis\Client;
use App\Config\DatabaseManager; 
use App\Config\RedisCache;
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

class Container implements ContainerInterface {
    private $instances = [];
    private $bindings = [];
    private $resolving = [];

    public function __construct() {
        // 1. Registrar Singletons base (MySQL Connection Manager)
        $db = new DatabaseManager(); 
        $this->instances[DatabaseManager::class] = $db; 
        
        // 1.1 Registrar Singleton base estricto (Redis)
        $redis = new RedisCache();
        $this->instances[Client::class] = $redis->getClient();
        
        // CORRECCIÓN VITAL: Registrar la clase RedisCache en sí misma para que el inyector de dependencias
        // sepa cómo resolver el nuevo constructor de RoleRepository, permitiendo el uso de executeWithLock()
        $this->instances[RedisCache::class] = $redis;
        
        // 2. Registrar Bindings (Interfaces conectadas a Implementaciones)
        $this->bindings[RateLimiterInterface::class] = RedisRateLimiter::class; 
        
        $this->bindings[UserPrefsManagerInterface::class] = UserPrefsManager::class;
        $this->bindings[SessionManagerInterface::class] = SessionManager::class;
        $this->bindings[UserRepositoryInterface::class] = UserRepository::class;
        
        // 3. Repositorios Clean Architecture
        $this->bindings[TokenRepositoryInterface::class] = TokenRepository::class;
        $this->bindings[VerificationCodeRepositoryInterface::class] = RedisVerificationCodeRepository::class; 
        $this->bindings[ProfileLogRepositoryInterface::class] = ProfileLogRepository::class;
        $this->bindings[ServerConfigRepositoryInterface::class] = ServerConfigRepository::class;
        $this->bindings[ModerationRepositoryInterface::class] = ModerationRepository::class;
        $this->bindings[RoleRepositoryInterface::class] = RoleRepository::class;
        
        // 4. Repositorio de Telemetría
        $this->bindings[TelemetryRepositoryInterface::class] = TelemetryRepository::class;
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
            throw new Exception("Error en contenedor: No se pudo reflejar {$className}");
        }

        if (!$reflection->isInstantiable()) {
            throw new Exception("La clase {$className} no es instanciable (interfaz sin binding o clase abstracta).");
        }

        $constructor = $reflection->getConstructor();

        if (is_null($constructor)) {
            return new $className;
        }

        $parameters = $constructor->getParameters();
        $dependencies = array_map(function($param) use ($className) {
            $type = $param->getType();
            
            if (!$type) {
                throw new Exception("Fallo en {$className}: El parámetro \${$param->getName()} no tiene tipo definido.");
            }
            
            if ($type instanceof ReflectionNamedType && $type->isBuiltin()) {
                if ($param->isDefaultValueAvailable()) {
                    return $param->getDefaultValue();
                }
                throw new Exception("Fallo en {$className}: No se puede auto-inyectar el parámetro primitivo \${$param->getName()} sin un valor por defecto.");
            }
            
            return $this->get($type->getName());
        }, $parameters);

        return $reflection->newInstanceArgs($dependencies);
    }
}
?>