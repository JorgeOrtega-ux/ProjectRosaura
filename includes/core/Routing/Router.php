<?php
// includes/core/Routing/Router.php

namespace App\Core\Routing;

use App\Core\System\Logger;
use App\Core\Helpers\Utils;

class Router {
    private $routes;
    private $basePath;

    public function __construct($routes) {
        $this->routes = $routes;
        $this->basePath = defined('APP_URL') ? APP_URL : ''; 
    }

    public function resolve() {
        $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        if (strpos($requestUri, $this->basePath) === 0) {
            $relativePath = substr($requestUri, strlen($this->basePath));
        } else {
            $relativePath = $requestUri;
        }

        if (strlen($relativePath) > 1 && substr($relativePath, -1) === '/') {
            $relativePath = rtrim($relativePath, '/');
        }

        if ($relativePath === '' || $relativePath === false) {
            $relativePath = '/';
        }

        if (!array_key_exists($relativePath, $this->routes)) {
            // Auditoría: Detección de posibles bots escaneando rutas o enlaces rotos
            Logger::warning("Route not found (404)", [
                'uri' => $requestUri, 
                'ip' => Utils::getIpAddress(),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
            ]);
            return ['view' => 'system/404.php'];
        }

        return $this->routes[$relativePath];
    }
}
?>