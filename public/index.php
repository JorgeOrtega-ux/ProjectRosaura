<?php
// public/index.php

// 1. Cargar el núcleo 
try {
    require_once __DIR__ . '/../includes/core/bootstrap.php';
} catch (\Throwable $e) {} // Silencio absoluto

// =========================================================================
// INYECCIÓN DE MODO MANTENIMIENTO (LOCKDOWN)
// =========================================================================
if (class_exists('\App\Core\Helpers\Utils') && \App\Core\Helpers\Utils::isMaintenanceActive()) {
    http_response_code(503);
    header('Retry-After: 300'); // Sugerir al navegador reintentar en 5 mins
    echo '<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mantenimiento - Project Rosaura</title>
        <style>
            body { background-color: #000000; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .container { max-width: 500px; padding: 2rem; border-radius: 1rem; background: #111111; border: 1px solid #333333; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; }
            p { color: #888888; margin-bottom: 0; }
            .loader { border: 3px solid #333333; border-top: 3px solid #ffffff; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 1rem auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="loader"></div>
            <h1>Sistema en Mantenimiento</h1>
            <p>Estamos realizando la restauración segura de la base de datos. Por favor, espera, recargaremos esta página automáticamente cuando el proceso termine.</p>
            <script>
                // Auto-recarga: Verifica cada 5 segundos si el modo mantenimiento ya se desactivó
                setInterval(() => {
                    fetch(window.location.href, { method: "HEAD" })
                        .then(response => { if (response.status !== 503) window.location.reload(); })
                        .catch(() => {});
                }, 5000);
            </script>
        </div>
    </body>
    </html>';
    exit; // Destruimos la ejecución aquí mismo.
}
// =========================================================================


// 2. Procesar el Enrutamiento 
try {
    require_once __DIR__ . '/../includes/core/route_handler.php';
} catch (\Throwable $e) {}

// 3. Renderizar el Layout HTML Principal
try {
    require_once __DIR__ . '/../includes/layouts/app.php';
} catch (\Throwable $e) {}
?>