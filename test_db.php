<?php
require 'includes/core/bootstrap.php';
use App\Core\System\Database;

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);
    $stmt = $pdo->query("DESCRIBE store_coin_packages");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo $col['Field'] . "\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
