<?php
// includes/core/Routing/Router.php

namespace App\Core\Routing;

class Router {
    private $routes;
    private $basePath;

    public function __construct($routes) {
        $this->routes = $routes;
        // Asignamos el valor de la variable de entorno, si no existe asume vacío
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

        // 1. Búsqueda de coincidencia exacta
        if (array_key_exists($relativePath, $this->routes)) {
            return $this->routes[$relativePath];
        }

        // 2. Búsqueda con parámetros dinámicos (ej: {uuid})
        foreach ($this->routes as $route => $config) {
            if (strpos($route, '{') !== false) {
                // Convertir {param} a un grupo de captura Regex
                $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<\1>[a-zA-Z0-9_-]+)', $route);
                $pattern = '#^' . $pattern . '$#';
                
                if (preg_match($pattern, $relativePath, $matches)) {
                    // Pasar parámetros atrapados a $_GET
                    foreach ($matches as $key => $value) {
                        if (is_string($key)) {
                            $_GET[$key] = $value;
                        }
                    }
                    return $config;
                }
            }
        }

        return ['view' => 'system/404.php'];
    }
}
?>