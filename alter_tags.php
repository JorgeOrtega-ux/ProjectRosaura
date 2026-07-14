<?php
require_once __DIR__ . '/includes/core/bootstrap.php';

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

$db = DatabaseManager::getInstance()->getConnection(DB::CONN_CANVASES);

try {
    $db->exec("ALTER TABLE " . DB::TBL_CANVASES . " ADD COLUMN tags JSON DEFAULT NULL AFTER name");
    echo "Added tags column successfully.\n";
} catch (\Exception $e) {
    echo "Error adding tags column: " . $e->getMessage() . "\n";
}
