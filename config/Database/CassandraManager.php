<?php

namespace App\Config\Database;

use Cassandra\Connection;
use Cassandra\Connection\StreamNodeConfig;
use Exception;
use App\Core\System\Logger;
use App\Core\Helpers\EnvLoader;

class CassandraManager {
    private $session = null;

    public function __construct() {
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
            $this->session = $conn;
        } catch (Exception $e) {
            Logger::error('Cassandra connection failure', [
                'exception' => $e->getMessage()
            ]);
            $this->session = null;
        }
    }

    public function getSession() {
        return $this->session;
    }
}
