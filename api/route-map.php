<?php
// api/route-map.php

$routesDir = __DIR__ . '/../config/Routes';
$modules = ['routes_primary', 'routes_secondary', 'routes_tertiary'];
$routeMap = [];

foreach ($modules as $module) {
    $filePath = "{$routesDir}/{$module}.php";
    if (file_exists($filePath)) {
        try {
            $moduleRoutes = require $filePath;
            if (is_array($moduleRoutes)) {
                $routeMap = array_merge($routeMap, $moduleRoutes);
            }
        } catch (\Throwable $e) {
            if (class_exists('App\\Core\\System\\Logger')) {
                \App\Core\System\Logger::error("Error loading route module: {$module}. " . $e->getMessage());
            }
        }
    }
}

return $routeMap;
