<?php
// config/TypesenseManager.php

namespace App\Config;

use Typesense\Client;
use App\Core\Helpers\EnvLoader;
use App\Core\System\Logger;
use Throwable;

class TypesenseManager {
    private ?Client $client = null;

    public function __construct() {
        $this->initClient();
    }

    private function initClient(): void {
        try {
            $host = EnvLoader::get('TYPESENSE_HOST', 'typesense');
            $port = EnvLoader::get('TYPESENSE_PORT', '8108');
            $protocol = EnvLoader::get('TYPESENSE_PROTOCOL', 'http');
            $apiKey = EnvLoader::get('TYPESENSE_API_KEY', '');

            if (empty($apiKey)) {
                throw new \Exception("La clave API de Typesense no está configurada en el entorno.");
            }

            // BLINDAJE: Verificamos que Composer haya instalado la librería antes de instanciarla
            if (class_exists('Typesense\Client')) {
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
            } else {
                Logger::error("La clase Typesense\Client no existe. El SDK no está instalado.");
            }

        } catch (\Throwable $e) {
            Logger::error("Error al inicializar el cliente de Typesense: " . $e->getMessage(), [
                'exception' => $e
            ]);
        }
    }

    public function getClient(): ?Client {
        return $this->client;
    }
}
?>