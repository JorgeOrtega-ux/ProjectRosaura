<?php
require_once __DIR__ . '/vendor/autoload.php';
define('ROOT_PATH', __DIR__);
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Core\Container;
use App\Api\Services\Canvas\CanvasCoreService;

try {
    $redisHost = $_ENV['REDIS_HOST'];
    $redisPort = (int)$_ENV['REDIS_PORT'];
    $redisParams = ['scheme' => 'tcp', 'host' => $redisHost, 'port' => $redisPort];
    if (!empty($_ENV['REDIS_PASS'])) {
        $redisParams['password'] = $_ENV['REDIS_PASS'];
    }
    $redisClient = new \Predis\Client($redisParams);
    $redisClient->ping(); 
    $sessionHandler = new \App\Core\System\RedisSessionHandler($redisClient);
    session_set_save_handler($sessionHandler, true);
    session_start();

    $container = new Container();
    $service = $container->get(CanvasCoreService::class);

    echo "Public Canvases from Service:\n";
    print_r($service->getPublicCanvases(1));
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
}
