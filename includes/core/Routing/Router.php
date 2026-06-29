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
        if ($relativePath === '/design') {
            header("Location: " . $this->basePath . "/");
            exit;
        }

        if (preg_match('#^/design/s/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return ['view' => 'canvases/snapshots-gallery.php'];
        }

        if (preg_match('#^/snapshot/view/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['id'] = $matches[1];
            return ['view' => 'canvases/snapshot-viewer.php'];
        }

        if (preg_match('#^/design/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['id'] = $matches[1]; // Opcionalmente cambiar a uuid si el backend lo requiere
            return ['view' => 'app/design.php'];
        }
        
        // --- MANEJO DE RUTAS DE PANEL DE CONTROL (CON UUID) ---
        
        // Resets
        if (preg_match('#^/canvases/manage/resets/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/resets/:uuid'] ?? [
                'view' => 'canvases/components/reset-manager.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }

        // Change Member Role (¡NUEVO BLOQUE PARA 2 PARÁMETROS!)
        if (preg_match('#^/canvases/members/([a-zA-Z0-9\-]+)/role/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            $_GET['user_uuid'] = $matches[2];
            return $this->routes['/canvases/members/:uuid/role/:user_uuid'] ?? [
                'view' => 'canvases/change-role.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }

        // Members
        if (preg_match('#^/canvases/members/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/members/:uuid'] ?? [
                'view' => 'canvases/members.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }

        // Requests
        if (preg_match('#^/canvases/manage/requests/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/manage/requests/:uuid'] ?? [
                'view' => 'canvases/requests.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }

        // Edit
        if (preg_match('#^/canvases/edit/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/edit/:uuid'] ?? [
                'view' => 'canvases/edit.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        
        // Resize
        if (preg_match('#^/canvases/resize/([a-zA-Z0-9\-]+)$#', $relativePath, $matches)) {
            $_GET['uuid'] = $matches[1];
            return $this->routes['/canvases/resize/:uuid'] ?? [
                'view' => 'canvases/resize.php',
                'auth' => true,
                'permissions' => ['manage_canvases'],
                'requires_2fa' => false
            ];
        }
        // ---------------------------------

        if (!array_key_exists($relativePath, $this->routes)) {
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