<?php

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

        // Special Redirects
        if ($relativePath === '/design') {
            header("Location: " . $this->basePath . "/");
            exit;
        }

        // 1. Check exact match first (static routes)
        if (array_key_exists($relativePath, $this->routes)) {
            return $this->routes[$relativePath];
        }

        // 2. Check dynamic match (routes with parameters like :uuid, :id, etc.)
        foreach ($this->routes as $routePattern => $routeConfig) {
            if (strpos($routePattern, ':') !== false) {
                // Convert route pattern to regex.
                // E.g., "/canvases/members/:uuid/role/:user_uuid"
                $patternParts = explode('/', $routePattern);
                $regexParts = [];
                $paramNames = [];
                
                foreach ($patternParts as $part) {
                    if (strpos($part, ':') === 0) {
                        $paramNames[] = substr($part, 1);
                        $regexParts[] = '([^/]+)';
                    } elseif (strpos($part, '@:') === 0) {
                        $paramNames[] = substr($part, 2);
                        $regexParts[] = '@([^/]+)';
                    } else {
                        $regexParts[] = preg_quote($part, '#');
                    }
                }
                
                $regex = '#^' . implode('/', $regexParts) . '$#';
                
                if (preg_match($regex, $relativePath, $matches)) {
                    // Map matches to $_GET
                    for ($i = 0; $i < count($paramNames); $i++) {
                        if (isset($matches[$i + 1])) {
                            $paramName = $paramNames[$i];
                            $val = urldecode($matches[$i + 1]);
                            $_GET[$paramName] = $val;
                            
                            // Maintain backward compatibility for keys expecting 'id' instead of 'uuid' or vice versa
                            if ($paramName === 'uuid' && !isset($_GET['id'])) {
                                $_GET['id'] = $val;
                            }
                            if ($paramName === 'id' && !isset($_GET['uuid'])) {
                                $_GET['uuid'] = $val;
                            }
                        }
                    }
                    return $routeConfig;
                }
            }
        }

        // 3. Fallback: Route not found (404)
        if ($relativePath !== '/favicon.ico') {
            Logger::warning("Route not found (404)", [
                'uri' => $_SERVER['REQUEST_URI'], 
                'ip' => Utils::getIpAddress(),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
            ]);
        }
        return ['view' => 'system/404.php'];
    }
}
?>