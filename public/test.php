<?php
require '../includes/core/bootstrap.php';
use App\Config\Container;

$container = Container::getInstance();
$canvasServices = $container->get('App\Api\Services\CanvasServices');

try {
    $res = $canvasServices->getMine(1, 50); // Assuming user 1
    print_r($res);
} catch (\Throwable $e) {
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
