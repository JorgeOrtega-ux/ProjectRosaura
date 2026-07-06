<?php
require_once __DIR__ . '/../vendor/autoload.php';
define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

$db = new DatabaseManager();
$pdo = $db->getConnection(DB::CONN_IDENTITY);

try {
    // Agregar columna 'coins' si no existe
    $pdo->exec("ALTER TABLE users ADD COLUMN coins INT NOT NULL DEFAULT 0");
    echo "Columna 'coins' agregada a 'users'.<br>";
} catch (\Exception $e) {
    echo "Error agregando 'coins' (probablemente ya existe): " . $e->getMessage() . "<br>";
}

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS store_purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            stripe_payment_intent_id VARCHAR(255) NULL,
            stripe_checkout_session_id VARCHAR(255) NULL,
            item_type VARCHAR(50) NOT NULL,
            item_amount INT NOT NULL,
            amount_cents INT NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'usd',
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (user_id),
            INDEX (stripe_checkout_session_id)
        )
    ");
    echo "Tabla 'store_purchases' creada o ya existe.<br>";
} catch (\Exception $e) {
    echo "Error creando 'store_purchases': " . $e->getMessage() . "<br>";
}

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_perks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            perk_id VARCHAR(50) NOT NULL,
            coins_spent INT NOT NULL DEFAULT 0,
            is_used TINYINT(1) NOT NULL DEFAULT 0,
            used_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (user_id)
        )
    ");
    echo "Tabla 'user_perks' creada o ya existe.<br>";
} catch (\Exception $e) {
    echo "Error creando 'user_perks': " . $e->getMessage() . "<br>";
}

echo "Proceso terminado.";
?>
