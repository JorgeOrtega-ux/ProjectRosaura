<?php

$routes = require 'f:\htdocs\ProjectRosaura\api\route-map.php';
$missing = [];
$high_limits = [];

foreach ($routes as $routeName => $config) {
    if (!isset($config['middleware']) || !is_array($config['middleware'])) {
        $missing[] = $routeName;
        continue;
    }

    $hasRateLimit = false;
    foreach ($config['middleware'] as $mw) {
        if (isset($mw['type']) && $mw['type'] === 'RateLimit') {
            $hasRateLimit = true;
            if (isset($mw['max']) && $mw['max'] > 100) {
                $high_limits[] = "$routeName (max: {$mw['max']} per {$mw['time']}s)";
            }
        }
    }

    if (!$hasRateLimit) {
        $missing[] = $routeName;
    }
}

echo "Missing RateLimit:\n";
print_r($missing);
echo "\nHigh Limits (>100):\n";
print_r($high_limits);
