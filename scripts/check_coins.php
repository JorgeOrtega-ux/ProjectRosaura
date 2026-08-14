<?php
define('ROOT_PATH', dirname(__DIR__));
require_once ROOT_PATH . '/vendor/autoload.php';
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);

echo "=== USERS COINS COLUMN ===\n";
$stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'coins'");
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n=== USERS IN DB ===\n";
$users = $pdo->query("SELECT id, uuid, username, email, coins FROM users")->fetchAll(PDO::FETCH_ASSOC);
print_r($users);
