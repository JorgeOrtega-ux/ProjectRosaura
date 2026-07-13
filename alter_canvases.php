<?php
require_once __DIR__ . '/includes/core/bootstrap.php';

use App\Config\Database\DatabaseManager;

$db = DatabaseManager::getInstance()->getConnection();

try {
    $db->exec("ALTER TABLE canvases ADD COLUMN is_locked TINYINT(1) DEFAULT 0");
    echo "Added is_locked column.\n";
} catch (\Exception $e) {
    echo "Error adding is_locked: " . $e->getMessage() . "\n";
}

try {
    $db->exec("ALTER TABLE canvases ADD COLUMN locked_reasons JSON NULL");
    echo "Added locked_reasons column.\n";
} catch (\Exception $e) {
    echo "Error adding locked_reasons: " . $e->getMessage() . "\n";
}
