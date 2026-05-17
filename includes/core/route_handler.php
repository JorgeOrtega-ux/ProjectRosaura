<?php
// includes/core/route_handler.php

use App\Core\Routing\Loader;
use App\Core\Routing\Router;

$routes = require ROOT_PATH . '/config/routes.php';
$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

$redirectUrl = null;
$requestUriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$systemMessageType = null;
$serverConfig = $serverConfig ?? [];
$isLoggedIn = $isLoggedIn ?? false;

// Utilizamos los permisos RBAC directamente de la sesión hidratada por bootstrap.php
$userPermissions = $_SESSION['user_permissions'] ?? [];
$isMaintenanceActive = isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1;

// "Privilegiado" significa estrictamente alguien con permiso para ver el panel de administración
$isPrivileged = in_array('access_admin_panel', $userPermissions);

if ($isMaintenanceActive && !$isPrivileged) {
    $currentView = 'system/message.php';
    $systemMessageType = 'maintenance';
    $redirectUrl = null; 
} else {
    
    if ($requestUriPath === APP_URL . '/account-suspended' || $requestUriPath === APP_URL . '/account-suspended/') {
        $systemMessageType = 'suspended';
    } elseif ($requestUriPath === APP_URL . '/account-deleted' || $requestUriPath === APP_URL . '/account-deleted/') {
        $systemMessageType = 'deleted';
    }

    // ==========================================
    // MODIFICACIÓN MULTI-SESIÓN: RUTAS GUEST
    // ==========================================
    if (!empty($routeData['guest_only']) && $isLoggedIn) {
        
        $linkedAccounts = $_SESSION['accounts'] ?? [];
        $isAuthView = (strpos($currentView, 'auth/') === 0);
        
        // EXCEPCIÓN: Si intenta acceder a login/register y tiene espacio en su pool de sesiones (<3)
        if ($isAuthView && count($linkedAccounts) < 3) {
            // Se le permite el acceso (actuará como "Añadir Cuenta")
        } else {
            // Comportamiento normal: expulsa a los que ya están full logueados o en rutas incorrectas
            if ($currentView === 'settings/guest.php') {
                $currentView = 'settings/your-profile.php';
                $redirectUrl = APP_URL . '/settings/your-profile';
            } else {
                $redirectUrl = APP_URL . '/';
            }
        }
    }

    if (!empty($routeData['auth']) && !$isLoggedIn) {
        if (strpos($currentView, 'admin/') === 0) {
            $currentView = 'system/message.php';
            $systemMessageType = '404';
        } else {
            $currentView = 'settings/guest.php';
            $redirectUrl = APP_URL . '/settings/guest';
        }
    }

    // Validación estricta de permisos RBAC para proteger las rutas
    if (!empty($routeData['permissions']) && $isLoggedIn) {
        $hasAccess = false;
        foreach ($routeData['permissions'] as $requiredPermission) {
            if (in_array($requiredPermission, $userPermissions)) {
                $hasAccess = true;
                break;
            }
        }
        if (!$hasAccess) {
            $currentView = 'system/message.php';
            $systemMessageType = '404';
        }
    }

    if (!empty($routeData['requires_2fa']) && $isLoggedIn && $currentView !== 'system/message.php') {
        if (empty($_SESSION['user_2fa'])) {
            $currentView = 'system/message.php';
            $systemMessageType = 'require_2fa';
        }
    }

    if ($currentView === 'system/404.php') {
        $currentView = 'system/message.php';
        $systemMessageType = '404';
    }

    if ($currentView !== 'system/message.php' && !$redirectUrl) {
        if ($requestUriPath === APP_URL . '/admin' || $requestUriPath === APP_URL . '/admin/') {
            $currentView = 'admin/dashboard.php';
            $redirectUrl = APP_URL . '/admin/dashboard';
        } elseif ($currentView === 'settings/index.php') {
            $currentView = $isLoggedIn ? 'settings/your-profile.php' : 'settings/guest.php';
            $redirectUrl = $isLoggedIn ? APP_URL . '/settings/your-profile' : APP_URL . '/settings/guest';
        }
    }
}

$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isAuthRoute = (strpos($currentView, 'auth/') === 0) || in_array($requestUriPath, [APP_URL . '/account-suspended', APP_URL . '/account-suspended/', APP_URL . '/account-deleted', APP_URL . '/account-deleted/']);

if ($redirectUrl) {
    if ($isSpaRequest) header("X-SPA-Update-URL: " . $redirectUrl);
    else { header("Location: " . $redirectUrl); exit; }
}

if ($isSpaRequest) { 
    try {
        $loader->load($currentView); 
    } catch (\Throwable $e) {}
    exit; 
}
?>