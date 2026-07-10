<?php
require_once __DIR__ . '/includes/core/bootstrap.php';

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $dbManager = new DatabaseManager();
    $pdo = $dbManager->getConnection(DB::CONN_CANVASES);

    $pdo->exec("ALTER TABLE canvas_chat_messages ADD COLUMN attachments JSON DEFAULT NULL AFTER message;");
    echo "Columna attachments añadida a canvas_chat_messages.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "La columna ya existe.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
