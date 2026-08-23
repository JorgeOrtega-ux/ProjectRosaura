<?php

namespace App\Config\Database;

use PDO;
use PDOException;
use Exception;
use App\Core\System\Logger;
use App\Core\System\DatabaseConstants as DB;

class DatabaseManager {
    private static array $connections = [];

    public function __construct() {
    }

    public static function resetConnections(): void {
        self::$connections = [];
    }

    public function getConnection(string $connectionName = DB::CONN_IDENTITY): PDO {
        if (!isset($_ENV['DB_HOST']) || !isset($_ENV['DB_USER'])) {
            throw new Exception('err_db_env_missing');
        }

        $host = $_ENV['DB_HOST'];
        $port = $_ENV['DB_PORT'] ?? 3306;
        $user = $_ENV['DB_USER'];
        $pass = $_ENV['DB_PASS']; 
        
        $envVarName = 'DB_' . strtoupper($connectionName) . '_NAME';
        $dbname = $_ENV[$envVarName] ?? null;

        if (!$dbname) {
            throw new Exception('err_db_name_missing');
        }

        $connectionKey = $host . ':' . $port . '_' . $dbname;

        if (isset(self::$connections[$connectionKey])) {
            return self::$connections[$connectionKey];
        }

        try {
            $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            
            $appTimezone = $_ENV['APP_TIMEZONE'] ?? 'UTC';
            $offset = (new \DateTime('now', new \DateTimeZone($appTimezone)))->format('P');
            $pdo->exec("SET time_zone = '{$offset}';");
            
            self::$connections[$connectionKey] = $pdo;
            
            return $pdo;
        } catch (PDOException $e) {
            Logger::database('Critical database connection failure.', 'critical', [
                'dbname' => $dbname, 
                'context' => $connectionName, 
                'exception' => $e
            ]);
            
            throw new Exception('SYSTEM_DB_OFFLINE');
        }
    }

    public function getGlobalConnection(): PDO {
        if (!isset($_ENV['DB_HOST']) || !isset($_ENV['DB_USER'])) {
            throw new Exception('err_db_env_missing');
        }

        $host = $_ENV['DB_HOST'];
        $port = $_ENV['DB_PORT'] ?? 3306;
        $user = $_ENV['DB_USER'];
        $pass = $_ENV['DB_PASS'];
        
        $connectionKey = $host . ':' . $port . '_global';

        if (isset(self::$connections[$connectionKey])) {
            return self::$connections[$connectionKey];
        }

        try {
            $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            
            $appTimezone = $_ENV['APP_TIMEZONE'] ?? 'UTC';
            $offset = (new \DateTime('now', new \DateTimeZone($appTimezone)))->format('P');
            $pdo->exec("SET time_zone = '{$offset}';");
            
            self::$connections[$connectionKey] = $pdo;
            
            return $pdo;
        } catch (PDOException $e) {
            Logger::database('Global MySQL server connection failure.', 'critical', [
                'exception' => $e
            ]);
            throw new Exception('SYSTEM_DB_OFFLINE');
        }
    }
}
?>