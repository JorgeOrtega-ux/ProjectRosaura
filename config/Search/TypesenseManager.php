<?php

namespace App\Config\Search;

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
                Logger::error('err_typesense_api_missing');
                throw new \Exception("err_typesense_api_missing");
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
                Logger::error('err_typesense_sdk_missing');
                throw new \Exception("err_typesense_sdk_missing");
            }

        } catch (\Throwable $e) {
            Logger::error('err_typesense_init_failed', ['exception' => $e->getMessage()]);
            throw new \Exception("err_typesense_init_failed: " . $e->getMessage());
        }
    }

    public function getClient(): ?Client {

        if ($this->client === null) {
            Logger::error('err_typesense_not_initialized');
            throw new \Exception("err_typesense_not_initialized");
        }
        
        return $this->client;
    }
}
?>