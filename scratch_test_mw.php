<?php
require_once __DIR__ . '/vendor/autoload.php';
define('ROOT_PATH', __DIR__);
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

if (!function_exists('__')) {
    function __($key, $params = []) {
        try {
            return \App\Core\System\Translator::get($key, $params);
        } catch (\Throwable $e) {
            return $key;
        }
    }
}

$container = new \App\Core\Container();

echo "--- TESTING MIDDLEWARE FOR canvases.get ---\n";
try {
    $pipeline = new \App\Core\Routing\MiddlewarePipeline($container);
    $input = ['route' => 'canvases.get', 'id' => '18ba8826-a8e8-46bd-954e-868439508bbe'];
    $middlewaresConfig = [['type' => 'Telemetry'], ['type' => 'RateLimit', 'key' => 'canvas_get', 'max' => 20, 'time' => 1, 'identifier' => 'user_id']];
    $res = $pipeline->process($middlewaresConfig, $input);
    echo "PIPELINE RESULT: " . ($res ? 'PASSED' : 'FAILED') . "\n";
} catch (\Throwable $e) {
    echo "MIDDLEWARE EXCEPTION: " . $e->getMessage() . "\n" . $e->getFile() . ':' . $e->getLine() . "\n" . $e->getTraceAsString() . "\n";
}
