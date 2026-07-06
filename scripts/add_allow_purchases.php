<?php
require_once __DIR__ . '/../vendor/autoload.php';
use App\Core\Helpers\Env;

Env::load(__DIR__ . '/../.env');

$dbHost = Env::get('DB_HOST', 'db');
$dbUser = Env::get('DB_USER', 'system_web_executor');
$dbPass = Env::get('DB_PASS', '');
$dbName = Env::get('DB_CANVASES_NAME', 'db_canvases');

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Check if column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM `canvases` LIKE 'allow_purchases'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE `canvases` ADD COLUMN `allow_purchases` TINYINT(1) NOT NULL DEFAULT 1 AFTER `requires_approval`");
        echo "Columna allow_purchases añadida correctamente.\n";
    } else {
        echo "La columna allow_purchases ya existe.\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
