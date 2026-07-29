<?php
// public/index.php

// 1. Cargar el núcleo 
try {
    require_once __DIR__ . '/../includes/core/bootstrap.php';
} catch (\Throwable $e) {
    if (class_exists('\App\Core\System\Logger')) {
        \App\Core\System\Logger::security("Fatal Error loading bootstrap: " . $e->getMessage(), 'critical');
    }
}

// --- Global Page Rate Limiting (60 requests per minute) ---
if (class_exists('\App\Core\Helpers\Utils')) {
    \App\Core\Helpers\Utils::enforceIpRateLimit('global_page', 60, 60);
}
// -----------------------------------------------------------

// 2. Procesar el Enrutamiento 
try {
    require_once __DIR__ . '/../includes/core/route_handler.php';
} catch (\Throwable $e) {
    if (class_exists('\App\Core\System\Logger')) {
        \App\Core\System\Logger::security("Fatal Error loading route_handler: " . $e->getMessage(), 'critical');
    }
}



try {
    require_once __DIR__ . '/../includes/layouts/app.php';
} catch (\Throwable $e) {
    if (class_exists('\App\Core\System\Logger')) {
        \App\Core\System\Logger::security("Fatal Error loading app layout: " . $e->getMessage(), 'critical');
    }
}
?>