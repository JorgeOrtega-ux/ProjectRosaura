<?php
define('ROOT_PATH', dirname(__DIR__));
require_once ROOT_PATH . '/vendor/autoload.php';
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

define('APP_URL', rtrim($_ENV['APP_URL'] ?? 'http://localhost', '/'));
define('APP_NAME', $_ENV['APP_NAME'] ?? 'Rosaura');

if (session_status() === PHP_SESSION_NONE) session_start();
$_SESSION['user_id'] = 3;
$_SESSION['user_permissions'] = ['access_admin_panel', 'edit_users'];

$container = new \App\Core\Container();
$adminService = $container->get(\App\Api\Services\Admin\AdminServices::class);

$res = $adminService->adjustCoins([
    'target_user_id' => 2,
    'amount' => 50,
    'action' => 'add',
    'reason' => 'Test compensation'
]);

print_r($res);
