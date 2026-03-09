<?php
// includes/core/route_handler.php

use App\Core\Routing\Loader;
use App\Core\Routing\Router;

// Configuración de Rutas y Navegación
$routes = require ROOT_PATH . '/includes/config/routes.php';
$loader = new Loader();
$router = new Router($routes);

$routeData = $router->resolve();
$currentView = $routeData['view'];

$redirectUrl = null;
$requestUriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Variable global para que la vista genérica de mensajes sepa qué renderizar
global $systemMessageType;
$systemMessageType = null;

// Variables globales de sesión
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';

// Extraemos la configuración que fue cargada en bootstrap.php
global $serverConfig; 
$isMaintenanceActive = isset($serverConfig['maintenance_mode']) && $serverConfig['maintenance_mode'] == 1;
$isPrivileged = in_array($userRole, ['administrator', 'founder']);

// ====================================================================
// --- 0. INTERCEPCIÓN PRINCIPAL: MODO MANTENIMIENTO ---
// ====================================================================
if ($isMaintenanceActive && !$isPrivileged) {
    
    // Anulamos cualquier vista solicitada y forzamos el mensaje del sistema
    $currentView = 'system/message.php';
    $systemMessageType = 'maintenance';
    
    // Limpiamos cualquier redirección para evitar bucles
    $redirectUrl = null; 

} else {
    // ====================================================================
    // --- LÓGICA DE RUTEO NORMAL (Si no hay mantenimiento o si es Admin) ---
    // ====================================================================
    
    // Validar y configurar las vistas de mensajes especiales del sistema
    if ($requestUriPath === APP_URL . '/account-suspended' || $requestUriPath === APP_URL . '/account-suspended/') {
        $systemMessageType = 'suspended';
    } elseif ($requestUriPath === APP_URL . '/account-deleted' || $requestUriPath === APP_URL . '/account-deleted/') {
        $systemMessageType = 'deleted';
    }

    // 1. Validar rutas de "Solo Invitados" (guest_only)
    if (!empty($routeData['guest_only']) && $isLoggedIn) {
        if ($currentView === 'settings/guest.php') {
            $currentView = 'settings/your-profile.php';
            $redirectUrl = APP_URL . '/settings/your-profile';
        } else {
            $redirectUrl = APP_URL . '/';
        }
    }

    // 2. Validar rutas protegidas (auth)
    if (!empty($routeData['auth']) && !$isLoggedIn) {
        if (strpos($currentView, 'admin/') === 0 || strpos($currentView, 'studio/') === 0) {
            $currentView = 'system/message.php';
            $systemMessageType = '404';
        } else {
            $currentView = 'settings/guest.php';
            $redirectUrl = APP_URL . '/settings/guest';
        }
    }

    // 3. Validar rutas por roles permitidos (roles)
    if (!empty($routeData['roles']) && $isLoggedIn) {
        if (!in_array($userRole, $routeData['roles'])) {
            $currentView = 'system/message.php';
            $systemMessageType = '404';
        }
    }

    // 4. Validar rutas que requieren 2FA (requires_2fa)
    if (!empty($routeData['requires_2fa']) && $isLoggedIn && $currentView !== 'system/message.php') {
        if (empty($_SESSION['user_2fa'])) {
            $currentView = 'system/message.php';
            $systemMessageType = 'require_2fa';
        }
    }

    // 4.5 Validar Rutas de Studio (Validación de UUID y Redirección)
    if ($isLoggedIn && strpos($currentView, 'studio/') === 0) {
        $userIdentifier = $_SESSION['user_uuid'] ?? $_SESSION['user_id'];
        
        if ($requestUriPath === APP_URL . '/studio' || $requestUriPath === APP_URL . '/studio/') {
            // Redirigir al management panel del usuario
            $currentView = 'studio/management-panel.php';
            $redirectUrl = APP_URL . '/studio/management-panel/' . $userIdentifier;
        
        } elseif ($currentView !== 'studio/upload-video.php' && $currentView !== 'studio/uploading.php') {
            
            // Validar que el uuid en la URL existe y sea igual al de la sesión
            $requestedUuid = $_GET['uuid'] ?? '';
            
            // Intentar extraer el UUID si viene en el path (para rutas SPA amigables)
            if (empty($requestedUuid)) {
                $pathParts = explode('/', trim($requestUriPath, '/'));
                $requestedUuid = end($pathParts);
            }

            if (empty($requestedUuid) || $requestedUuid !== (string)$userIdentifier) {
                $currentView = 'system/message.php';
                $systemMessageType = 'unauthorized_studio';
                $redirectUrl = null;
            }
        }
    }

    // 4.8 NUEVO: VALIDACIÓN ESTRICTA DE UUID PARA RUTAS DEL REPRODUCTOR
    if ($currentView === 'app/watch.php') {
        // Extraer el UUID del URL Path (se descarta la query string por el parse_url inicial)
        $pathParts = explode('/', trim($requestUriPath, '/'));
        $watchIndex = array_search('watch', $pathParts);
        $videoUuid = ($watchIndex !== false && isset($pathParts[$watchIndex + 1])) ? $pathParts[$watchIndex + 1] : '';

        // Comprobamos con Expresión Regular si es un UUID válido (Formato 8-4-4-4-12)
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $videoUuid)) {
            $currentView = 'system/message.php';
            $systemMessageType = '404';
            $redirectUrl = null;
        }
    }

    // Interceptar el 404 del Router nativo
    if ($currentView === 'system/404.php') {
        $currentView = 'system/message.php';
        $systemMessageType = '404';
    }

    // 5. Alias y Redirecciones internas
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

// Lógica de Redirección SPA
$isSpaRequest = !empty($_SERVER['HTTP_X_SPA_REQUEST']);
$isAuthRoute = (strpos($currentView, 'auth/') === 0) || in_array($requestUriPath, [APP_URL . '/account-suspended', APP_URL . '/account-suspended/', APP_URL . '/account-deleted', APP_URL . '/account-deleted/']);

if ($redirectUrl) {
    if ($isSpaRequest) header("X-SPA-Update-URL: " . $redirectUrl);
    else { header("Location: " . $redirectUrl); exit; }
}

if ($isSpaRequest) { 
    $loader->load($currentView); 
    exit; 
}
?>