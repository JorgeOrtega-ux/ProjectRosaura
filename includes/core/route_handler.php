<?php

use App\Core\Routing\Loader;
use App\Core\Routing\Router;

$routes = require ROOT_PATH . '/config/Routes/routes.php';
$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

$redirectUrl = null;
$requestUriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$systemMessageType = null;
$serverConfig = $serverConfig ?? [];
$isLoggedIn = $isLoggedIn ?? false;

$userPermissions = $_SESSION['user_permissions'] ?? [];
$isMaintenanceActive = isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1;

$isPrivileged = in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $userPermissions);

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

    if (!empty($routeData['guest_only']) && $isLoggedIn) {
        
        $linkedAccounts = $_SESSION['accounts'] ?? [];
        $isAuthView = (strpos($currentView, 'auth/') === 0);
        
        if ($isAuthView && count($linkedAccounts) < 3) {
            
        } else {
            if ($currentView === 'settings/guest.php') {
                $currentView = 'settings/profile/your-account.php';
                $redirectUrl = APP_URL . '/settings/your-account';
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
            $currentView = 'auth/login.php';
            $redirectUrl = APP_URL . '/login';
        }
    }

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
            $currentView = $isLoggedIn ? 'settings/profile/your-account.php' : 'settings/guest.php';
            $redirectUrl = $isLoggedIn ? APP_URL . '/settings/your-account' : APP_URL . '/settings/guest';
        }
    }
}

$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isAuthRoute = (strpos($currentView, 'auth/') === 0) || in_array($requestUriPath, [APP_URL . '/account-suspended', APP_URL . '/account-suspended/', APP_URL . '/account-deleted', APP_URL . '/account-deleted/']);

if ($redirectUrl) {
    if ($isSpaRequest) header("X-SPA-Update-URL: " . $redirectUrl);
    else { header("Location: " . $redirectUrl); exit; }
}

$initialCanvasesJson = '[]';
if ($currentView === 'app/home.php' && class_exists('\App\Api\Services\Canvas\CanvasCoreService')) {
    try {
        global $container, $sessionManager;
        if ($container && $sessionManager) {
            $canvasServices = $container->get(\App\Api\Services\Canvas\CanvasCoreService::class);
            $userId = $isLoggedIn ? $sessionManager->getActiveAccountId() : null;
            $perms = $isLoggedIn ? $sessionManager->getPermissions() : [];
            if (empty($perms) && isset($_SESSION['user_permissions'])) {
                $perms = $_SESSION['user_permissions'];
            }
            $canManageOfficial = in_array(\App\Core\System\PermissionsConstants::ACCESS_ADMIN_PANEL, $perms) || 
                                 in_array(\App\Core\System\PermissionsConstants::CANVASES_MANAGE_OFFICIAL, $perms) || 
                                 in_array(\App\Core\System\PermissionsConstants::CANVASES_CREATE_OFFICIAL, $perms);

            $res = $canvasServices->getHomeFeed($userId, 'all', 20, 0, $canManageOfficial);
            if ($res && isset($res['success']) && $res['success'] && isset($res['data'])) {
                $initialCanvasesJson = htmlspecialchars(json_encode($res['data']), ENT_QUOTES, 'UTF-8');
            }
        }
    } catch (\Throwable $e) {
        if (class_exists('\App\Core\System\Logger')) {
            \App\Core\System\Logger::security("Error fetching home feed: " . $e->getMessage(), 'error');
        }
    }
}

if ($isSpaRequest) { 
    try {
        $loader->load($currentView); 
    } catch (\Throwable $e) {
        if (class_exists('\App\Core\System\Logger')) {
            \App\Core\System\Logger::security("Error loading SPA view $currentView: " . $e->getMessage(), 'error');
        }
    }
    exit; 
}
?>