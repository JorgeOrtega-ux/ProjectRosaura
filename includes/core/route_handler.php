<?php
// includes/core/route_handler.php

use App\Core\Routing\Loader;
use App\Core\Routing\Router;

// Configuración de Rutas y Navegación
$routes = require __DIR__ . '/../config/routes.php';
$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

$redirectUrl = null;
$requestUriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Validar rutas de "Solo Invitados" (guest_only)
if (!empty($routeData['guest_only']) && $isLoggedIn) {
    if ($currentView === 'settings/guest.php') {
        $currentView = 'settings/your-profile.php';
        $redirectUrl = '/ProjectRosaura/settings/your-profile';
    } else {
        $redirectUrl = '/ProjectRosaura/';
    }
}

// 2. Validar rutas protegidas (auth)
if (!empty($routeData['auth']) && !$isLoggedIn) {
    if (strpos($currentView, 'admin/') === 0) {
        $currentView = 'system/404.php'; 
    } else {
        $currentView = 'settings/guest.php';
        $redirectUrl = '/ProjectRosaura/settings/guest';
    }
}

// 3. Validar rutas por roles permitidos (roles)
if (!empty($routeData['roles']) && $isLoggedIn) {
    if (!in_array($userRole, $routeData['roles'])) {
        $currentView = 'system/404.php'; 
    }
}

// 4. Alias y Redirecciones internas
if ($currentView !== 'system/404.php' && !$redirectUrl) {
    if ($requestUriPath === '/ProjectRosaura/admin' || $requestUriPath === '/ProjectRosaura/admin/') {
        $currentView = 'admin/dashboard.php';
        $redirectUrl = '/ProjectRosaura/admin/dashboard';
    } elseif ($currentView === 'settings/index.php') {
        $currentView = $isLoggedIn ? 'settings/your-profile.php' : 'settings/guest.php';
        $redirectUrl = $isLoggedIn ? '/ProjectRosaura/settings/your-profile' : '/ProjectRosaura/settings/guest';
    }
}

// Lógica de Redirección SPA
$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isAuthRoute = (strpos($currentView, 'auth/') === 0);

if ($redirectUrl) {
    if ($isSpaRequest) header("X-SPA-Update-URL: " . $redirectUrl);
    else { header("Location: " . $redirectUrl); exit; }
}

if ($isSpaRequest) { 
    $loader->load($currentView); 
    exit; 
}
?>