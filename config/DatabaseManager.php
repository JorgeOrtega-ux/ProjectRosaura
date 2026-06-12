<?php
// config/DatabaseManager.php

namespace App\Config;

use PDO;
use PDOException;
use Exception;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;

class DatabaseManager {
    private $connections = [];

    public function __construct() {
        // Se ha eliminado la carga redundante de EnvLoader. 
        // Las variables de entorno ya están disponibles en memoria gracias a bootstrap.php
    }

    public function getConnection(string $connectionName = DB::CONN_IDENTITY): PDO {
        if (!isset($_ENV['DB_HOST']) || !isset($_ENV['DB_USER'])) {
            throw new Exception("Critical Failure: DB_HOST or DB_USER variables are not defined in the environment.");
        }

        $host = $_ENV['DB_HOST'];
        $user = $_ENV['DB_USER'];
        $pass = $_ENV['DB_PASS'] ?? ''; 
        
        $envVarName = 'DB_' . strtoupper($connectionName) . '_NAME';
        $dbname = $_ENV[$envVarName] ?? $_ENV['DB_IDENTITY_NAME'] ?? null;

        if (!$dbname) {
            throw new Exception("Critical Failure: Could not determine the database name.");
        }

        $connectionKey = $host . '_' . $dbname;

        if (isset($this->connections[$connectionKey])) {
            return $this->connections[$connectionKey];
        }

        try {
            $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false); // MITIGACIÓN SQLi: Deshabilita preparaciones emuladas
            
            $appTimezone = $_ENV['APP_TIMEZONE'] ?? 'UTC';
            $offset = (new \DateTime('now', new \DateTimeZone($appTimezone)))->format('P');
            $pdo->exec("SET time_zone = '{$offset}';");
            
            $this->connections[$connectionKey] = $pdo;
            
            return $pdo;
        } catch (PDOException $e) {
            Logger::database("Database connection error [{$dbname} / Context: {$connectionName}]: " . $e->getMessage(), 'error');
            
            throw new Exception("SYSTEM_DB_OFFLINE");
        }
    }

    public function getGlobalConnection(): PDO {
        if (!isset($_ENV['DB_HOST']) || !isset($_ENV['DB_USER'])) {
            throw new Exception("Critical Failure: DB_HOST or DB_USER variables are not defined in the environment.");
        }

        $host = $_ENV['DB_HOST'];
        $user = $_ENV['DB_USER'];
        $pass = $_ENV['DB_PASS'] ?? '';
        
        $connectionKey = $host . '_global';

        if (isset($this->connections[$connectionKey])) {
            return $this->connections[$connectionKey];
        }

        try {
            $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false); // MITIGACIÓN SQLi: Deshabilita preparaciones emuladas
            
            $appTimezone = $_ENV['APP_TIMEZONE'] ?? 'UTC';
            $offset = (new \DateTime('now', new \DateTimeZone($appTimezone)))->format('P');
            $pdo->exec("SET time_zone = '{$offset}';");
            
            $this->connections[$connectionKey] = $pdo;
            
            return $pdo;
        } catch (PDOException $e) {
            Logger::database("Global MySQL server connection error: " . $e->getMessage(), 'error');
            throw new Exception("SYSTEM_DB_OFFLINE");
        }
    }
}
?>