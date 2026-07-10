<?php


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

                throw new \Exception("La clase Typesense\Client no existe. El SDK de Typesense no está instalado en vendor/.");
            }

        } catch (\Throwable $e) {

            throw new \Exception("Fallo al crear TypesenseManager: " . $e->getMessage());
        }
    }

    public function getClient(): ?Client {

        if ($this->client === null) {
            throw new \Exception("El cliente de Typesense nunca se inicializó correctamente.");
        }
        
        return $this->client;
    }
}
?>