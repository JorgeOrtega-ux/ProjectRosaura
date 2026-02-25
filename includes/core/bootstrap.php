<?php
// includes/core/bootstrap.php

session_start();

// Cabeceras de seguridad
header("X-Frame-Options: SAMEORIGIN");
header("X-Content-Type-Options: nosniff");
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://api.qrserver.com; connect-src 'self'; frame-ancestors 'none';");

require_once __DIR__ . '/../../vendor/autoload.php';

use App\Core\Helpers\Utils; 
use App\Core\System\Translator; 
use App\Core\Container;
use App\Api\Services\AuthServices;
use App\Core\Interfaces\UserPrefsManagerInterface;

// 1. Instanciar el Contenedor
$container = new Container();

// 2. Obtener servicios
$authService = $container->get(AuthServices::class);
$prefsManager = $container->get(UserPrefsManagerInterface::class);

// Manejo de Seguridad de Dispositivos y AutoLogin
if (isset($_SESSION['user_id'])) {
    if (!$authService->isCurrentDeviceValid()) {
        $authService->logout();
        header("Location: /ProjectRosaura/login");
        exit;
    }
} elseif (isset($_COOKIE['remember_token'])) {
    $authService->autoLogin(); 
}

// Generar Token CSRF para la sesión
$csrfToken = Utils::generateCSRFToken();

// Variables globales de estado
$isLoggedIn = isset($_SESSION['user_id']);
$userRole = $_SESSION['user_role'] ?? 'user';

// Sincronizar preferencias si faltan en la sesión
if ($isLoggedIn && !isset($_SESSION['user_prefs'])) {
    $_SESSION['user_prefs'] = $prefsManager->ensureDefaultPreferences($_SESSION['user_id']);
}

// Inicialización de Idioma
$lang = 'es-419';
if ($isLoggedIn && !empty($_SESSION['user_prefs']['language'])) {
    $lang = $_SESSION['user_prefs']['language'];
} elseif (isset($_COOKIE['pr_language'])) {
    $lang = $_COOKIE['pr_language']; 
} else {
    $lang = Utils::getClosestLanguage($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
}

Translator::init($lang);
if (!function_exists('__')) { 
    function __($key) { return Translator::get($key); } 
}
?>