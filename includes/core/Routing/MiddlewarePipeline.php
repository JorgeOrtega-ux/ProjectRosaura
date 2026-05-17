<?php
// includes/core/Routing/MiddlewarePipeline.php

namespace App\Core\Routing;

use App\Core\Container;
use App\Core\System\Logger;

class MiddlewarePipeline {
    private Container $container;

    public function __construct(Container $container) {
        $this->container = $container;
    }

    public function process(array $middlewaresConfig, array $input): bool {
        foreach ($middlewaresConfig as $config) {
            $type = $config['type'] ?? null;
            if (!$type) continue;

            $className = "App\\Core\\Middlewares\\" . $type . "Middleware";

            if (!class_exists($className)) {
                Logger::error("Fallo Fatal: Middleware no encontrado en pipeline: {$className}");
                http_response_code(500);
                echo json_encode(['success' => false, 'message_key' => 'error.internal_server_error']);
                return false; 
            }

            try {
                $middleware = $this->container->get($className);
                $passed = $middleware->handle($input, $config);
                
                if (!$passed) {
                    return false; // El middleware bloqueó la petición
                }
            } catch (\Exception $e) {
                Logger::error("Error ejecutando middleware {$className}", ['exception' => $e->getMessage()]);
                http_response_code(500);
                echo json_encode(['success' => false, 'message_key' => 'error.internal_server_error']);
                return false;
            }
        }

        return true; 
    }
}
?>