<?php
require_once __DIR__ . '/includes/core/bootstrap.php';
$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
try {
    $pdo->exec("ALTER TABLE server_config ADD COLUMN password_reset_expiration_minutes INT NOT NULL DEFAULT 15;");
    echo "Columna password_reset_expiration_minutes añadida con éxito.\n";
} catch (\Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "La columna ya existe.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
