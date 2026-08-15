<?php

namespace App\Config\Database;

use Cassandra\Connection;
use Cassandra\Connection\StreamNodeConfig;
use Exception;
use App\Core\System\Logger;
use App\Core\Helpers\EnvLoader;

class CassandraManager {
    private static $sharedSession = null;
    private static bool $connectionAttempted = false;

    public function __construct() {
    }

    public static function resetSession(): void {
        self::$sharedSession = null;
        self::$connectionAttempted = false;
    }

    public function getSession() {
        if (self::$sharedSession !== null) {
            return self::$sharedSession;
        }

        if (self::$connectionAttempted) {
            return null;
        }

        self::$connectionAttempted = true;

        $host = EnvLoader::get('CASSANDRA_HOST', 'cassandra');
        $port = (int)EnvLoader::get('CASSANDRA_PORT', 9042);
        $keyspace = EnvLoader::get('CASSANDRA_KEYSPACE', 'db_canvases_nosql');

        try {
            $nodes = [
                new StreamNodeConfig(
                    host: $host,
                    port: $port
                )
            ];

            $conn = new Connection($nodes, keyspace: $keyspace);
            $conn->connect();
            self::$sharedSession = $conn;
        } catch (Exception $e) {
            Logger::error('Cassandra connection failure', [
                'exception' => $e->getMessage()
            ]);
            self::$sharedSession = null;
        }

        return self::$sharedSession;
    }
}
