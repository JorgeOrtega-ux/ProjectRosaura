<?php
// includes/core/Container.php

namespace App\Core;

use Psr\Container\ContainerInterface;
use Exception;
use ReflectionClass;
use PDO;
use App\Config\Database;
use App\Core\RateLimiter;
use App\Core\Interfaces\RateLimiterInterface;
use App\Core\UserPrefsManager;
use App\Core\Interfaces\UserPrefsManagerInterface;
use App\Core\SessionManager;
use App\Core\Interfaces\SessionManagerInterface;
use App\Core\Repositories\UserRepository;
use App\Core\Interfaces\UserRepositoryInterface;

class Container implements ContainerInterface {
    private $instances = [];
    private $bindings = [];

    public function __construct() {
        // 1. Registrar Singletons base
        $db = new Database();
        $this->instances[PDO::class] = $db->getConnection();
        
        // 2. Registrar Bindings (Interfaces conectadas a Implementaciones)
        $this->bindings[RateLimiterInterface::class] = RateLimiter::class;
        $this->bindings[UserPrefsManagerInterface::class] = UserPrefsManager::class;
        $this->bindings[SessionManagerInterface::class] = SessionManager::class;
        $this->bindings[UserRepositoryInterface::class] = UserRepository::class;
    }

    public function get(string $id) {
        // Si ya está instanciado, devolver el singleton
        if (isset($this->instances[$id])) {
            return $this->instances[$id];
        }

        // Si es una interfaz, buscar qué clase concreta la implementa
        $concrete = $this->bindings[$id] ?? $id;
        
        // Resolver instanciación dinámica
        $resolved = $this->resolve($concrete);
        
        // Guardar para futuros llamados (Singleton por petición)
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
            throw new Exception("La clase {$className} no es instanciable (interfaz sin binding).");
        }

        $constructor = $reflection->getConstructor();

        // Si no tiene constructor, instanciar directamente
        if (is_null($constructor)) {
            return new $className;
        }

        $parameters = $constructor->getParameters();
        $dependencies = array_map(function($param) use ($className) {
            $type = $param->getType();
            if (!$type || $type->isBuiltin()) {
                throw new Exception("Fallo en {$className}: No se puede inyectar el parámetro \${$param->getName()}");
            }
            // Llamada recursiva para resolver la dependencia
            return $this->get($type->getName());
        }, $parameters);

        return $reflection->newInstanceArgs($dependencies);
    }
}
?>