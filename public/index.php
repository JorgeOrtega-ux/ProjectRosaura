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

// 2. Procesar el Enrutamiento 
try {
    require_once __DIR__ . '/../includes/core/route_handler.php';
} catch (\Throwable $e) {
    if (class_exists('\App\Core\System\Logger')) {
        \App\Core\System\Logger::security("Fatal Error loading route_handler: " . $e->getMessage(), 'critical');
    }
}

// 3. Renderizar el Layout HTML Principal
try {
    require_once __DIR__ . '/../includes/layouts/app.php';
} catch (\Throwable $e) {
    if (class_exists('\App\Core\System\Logger')) {
        \App\Core\System\Logger::security("Fatal Error loading app layout: " . $e->getMessage(), 'critical');
    }
}
?>