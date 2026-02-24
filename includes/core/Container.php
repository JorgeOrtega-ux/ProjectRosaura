<?php
// includes/core/Container.php

namespace App\Core;

use App\Config\Database;
use App\Core\RateLimiter;
use App\Core\UserPrefsManager;
use App\Api\Services\AuthServices;
use App\Api\Services\SettingsServices;
use App\Api\Controllers\AuthController;
use App\Api\Controllers\SettingsController;

class Container {
    private $pdo;
    private $rateLimiter;
    private $userPrefsManager;

    // Singleton de PDO: Garantiza 1 sola conexión física por request
    public function getPDO() {
        if ($this->pdo === null) {
            $db = new Database();
            $this->pdo = $db->getConnection();
        }
        return $this->pdo;
    }

    // Singleton de RateLimiter (inyectando PDO)
    public function getRateLimiter() {
        if ($this->rateLimiter === null) {
            $this->rateLimiter = new RateLimiter($this->getPDO());
        }
        return $this->rateLimiter;
    }

    // Singleton de UserPrefsManager (inyectando PDO)
    public function getUserPrefsManager() {
        if ($this->userPrefsManager === null) {
            $this->userPrefsManager = new UserPrefsManager($this->getPDO());
        }
        return $this->userPrefsManager;
    }

    // Fábrica de AuthServices
    public function getAuthServices() {
        return new AuthServices(
            $this->getPDO(),
            $this->getRateLimiter(),
            $this->getUserPrefsManager()
        );
    }

    // Fábrica de SettingsServices
    public function getSettingsServices() {
        return new SettingsServices(
            $this->getPDO(),
            $this->getRateLimiter()
        );
    }

    // Fábrica de AuthController (inyectando su servicio ya ensamblado)
    public function getAuthController() {
        return new AuthController($this->getAuthServices());
    }

    // Fábrica de SettingsController (inyectando su servicio ya ensamblado)
    public function getSettingsController() {
        return new SettingsController($this->getSettingsServices());
    }

    /**
     * Resuelve y devuelve la instancia del Controlador solicitado dinámicamente.
     */
    public function get($className) {
        if ($className === 'App\Api\Controllers\AuthController') {
            return $this->getAuthController();
        }
        if ($className === 'App\Api\Controllers\SettingsController') {
            return $this->getSettingsController();
        }

        throw new \Exception("Clase no registrada en el contenedor de dependencias: " . $className);
    }
}
?>