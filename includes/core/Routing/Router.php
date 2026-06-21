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

        // --- MANEJO DE RUTAS DE DISEÑO ---
        // 1. Redirigir si acceden a /design sin UUID al home
        if ($relativePath === '/design') {
            header("Location: " . $this->basePath . "/");
            exit;
        }

        // 2. Manejar rutas dinámicas para /design/s/{uuid} (Galería de Snapshots)
        // DEBE IR ANTES de la regla del lienzo normal para evitar conflictos
        if (preg_match('#^/design/s/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            // Guardamos el uuid por si lo necesitas directo en $_GET
            $_GET['uuid'] = $matches[1];
            return ['view' => 'canvases/snapshots-gallery.php'];
        }

        // NUEVO: Manejar rutas dinámicas para /snapshot/view/{uuid} (Visor Individual)
        if (preg_match('#^/snapshot/view/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            // Guardamos el id del snapshot en $_GET para que lo lea snapshot-viewer.php
            $_GET['id'] = $matches[1];
            return ['view' => 'app/snapshot-viewer.php'];
        }

        // 3. Manejar rutas dinámicas para /design/{uuid} (Lienzo Normal)
        if (preg_match('#^/design/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            // Guardamos el uuid por si el backend (PHP) lo requiere
            $_GET['id'] = $matches[1];
            return ['view' => 'app/design.php'];
        }
        // ---------------------------------

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