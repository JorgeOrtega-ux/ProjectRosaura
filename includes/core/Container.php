<?php
// includes/core/Container.php

namespace App\Core;

use Psr\Container\ContainerInterface;
use Exception;
use ReflectionClass;
use ReflectionNamedType;
use PDO;
use Predis\Client;
use App\Config\Database;
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
use App\Core\Interfaces\VideoRepositoryInterface;
use App\Core\Repositories\VideoRepository;
use App\Core\Interfaces\TagRepositoryInterface;
use App\Core\Repositories\TagRepository;
use App\Core\Interfaces\SubscriptionRepositoryInterface;
use App\Core\Repositories\SubscriptionRepository;
use App\Core\Interfaces\PlaylistRepositoryInterface;
use App\Core\Repositories\PlaylistRepository;

class Container implements ContainerInterface {
    private $instances = [];
    private $bindings = [];
    private $resolving = [];

    public function __construct() {
        // 1. Registrar Singletons base (MySQL)
        $db = new Database();
        $this->instances[PDO::class] = $db->getConnection();
        
        // 1.1 Registrar Singleton base (Redis)
        $redis = new RedisCache();
        $this->instances[Client::class] = $redis->getClient();
        
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
        $this->bindings[TagRepositoryInterface::class] = TagRepository::class;
        $this->bindings[SubscriptionRepositoryInterface::class] = SubscriptionRepository::class; 
        
        // 4. Repositorios de Contenido (Studio)
        $this->bindings[VideoRepositoryInterface::class] = VideoRepository::class;
        $this->bindings[PlaylistRepositoryInterface::class] = PlaylistRepository::class; 
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