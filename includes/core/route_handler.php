<?php

use App\Core\Routing\Loader;
use App\Core\Routing\Router;

$routes = require ROOT_PATH . '/config/Routes/routes.php';
$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

$redirectUrl = null;
$requestUriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$basePath = parse_url(APP_URL, PHP_URL_PATH) ?? '';
$basePath = rtrim($basePath, '/');
$cleanPath = $requestUriPath;
if (!empty($basePath) && strpos($cleanPath, $basePath) === 0) {
    $cleanPath = substr($cleanPath, strlen($basePath));
}
$cleanPath = rtrim($cleanPath, '/') ?: '/';

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
    
    if ($cleanPath === '/account-suspended') {
        $systemMessageType = 'suspended';
    } elseif ($cleanPath === '/account-deleted') {
        $systemMessageType = 'deleted';
    }

    if (!empty($routeData['guest_only']) && $isLoggedIn) {
        
        $linkedAccounts = $_SESSION['accounts'] ?? [];
        $isAuthView = (strpos($currentView, 'auth/') === 0);
        
        if ($isAuthView && count($linkedAccounts) < 3) {
            
        } else {
            if ($currentView === 'settings/preferences/guest.php' || $currentView === 'settings/guest.php') {
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
            $systemMessageType = 'no_permission';
        }
    }

    if (!empty($routeData['subscription_feature']) && $isLoggedIn && $currentView !== 'system/message.php') {
        $feature = $routeData['subscription_feature'];
        $tier = $_SESSION['subscription_tier'] ?? 0;
        
        if (class_exists('\App\Core\System\SubscriptionPlanConstants')) {
            if (!\App\Core\System\SubscriptionPlanConstants::hasFeature($tier, $feature)) {
                $currentView = 'system/message.php';
                $systemMessageType = 'subscription_required';
            }
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
        if ($cleanPath === '/explore') {
            $redirectUrl = APP_URL . '/';
        } elseif ($cleanPath === '/admin') {
            $currentView = 'admin/dashboard.php';
            $redirectUrl = APP_URL . '/admin/dashboard';
        } elseif ($currentView === 'settings/index.php') {
            $currentView = $isLoggedIn ? 'settings/profile/your-account.php' : 'settings/preferences/guest.php';
            $redirectUrl = $isLoggedIn ? APP_URL . '/settings/your-account' : APP_URL . '/settings/guest';
        } elseif ($currentView === 'site-policy/site-policy.php') {
            $currentView = 'site-policy/terms-conditions.php';
            $redirectUrl = APP_URL . '/site-policy/terms-conditions';
        }
    }
}

$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isAuthRoute = (strpos($currentView, 'auth/') === 0) || in_array($cleanPath, ['/account-suspended', '/account-deleted']);

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
            if ($userId) {
                $res = $canvasServices->getMine($userId, 50, 'mine', 0);
            } else {
                $res = $canvasServices->getHomeFeed(null, 'all', 20, 0);
            }
            if ($res && isset($res['success']) && $res['success'] && isset($res['data'])) {
                $initialCanvasesJson = htmlspecialchars(json_encode($res['data']), ENT_QUOTES, 'UTF-8');
            }
        }
    } catch (\Throwable $e) {
        if (class_exists('\App\Core\System\Logger')) {
            \App\Core\System\Logger::error("Error fetching initial canvases: " . $e->getMessage(), ['exception' => $e]);
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