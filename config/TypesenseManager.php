<?php
// config/TypesenseManager.php

namespace App\Config;

use Typesense\Client;
use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;
use Exception;

class TypesenseManager {
    private Client $client;
    private Logger $logger;

    public function __construct(Logger $logger) {
        $this->logger = $logger;
        $this->initClient();
    }

    private function initClient(): void {
        try {
            $host = EnvLoader::get('TYPESENSE_HOST', 'typesense');
            $port = EnvLoader::get('TYPESENSE_PORT', '8108');
            $protocol = EnvLoader::get('TYPESENSE_PROTOCOL', 'http');
            $apiKey = EnvLoader::get('TYPESENSE_API_KEY', '');

            if (empty($apiKey)) {
                throw new Exception("La clave API de Typesense (TYPESENSE_API_KEY) no está configurada en el entorno.");
            }

            $this->client = new Client([
                'nodes' => [
                    [
                        'host'     => $host,
                        'port'     => $port,
                        'protocol' => $protocol,
                    ]
                ],
                'api_key'                    => $apiKey,
                'connection_timeout_seconds' => 3,
            ]);

        } catch (Exception $e) {
            // Se utiliza estrictamente el Logger personalizado del sistema
            $this->logger->error("Error al inicializar el cliente de Typesense: " . $e->getMessage(), [
                'exception' => $e
            ]);
        }
    }

    public function getClient(): Client {
        return $this->client;
    }
}
?>