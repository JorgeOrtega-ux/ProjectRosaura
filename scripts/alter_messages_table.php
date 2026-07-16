<?php
require_once __DIR__ . '/../includes/core/bootstrap.php';
$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_CANVASES);

try {
    // Add deleted_by column
    $pdo->exec("ALTER TABLE canvas_chat_messages ADD COLUMN deleted_by VARCHAR(50) DEFAULT NULL;");
    echo "Columna deleted_by añadida con éxito.\n";
} catch (\Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "La columna deleted_by ya existe.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}

try {
    // Add delete_reason column
    $pdo->exec("ALTER TABLE canvas_chat_messages ADD COLUMN delete_reason TEXT DEFAULT NULL;");
    echo "Columna delete_reason añadida con éxito.\n";
} catch (\Exception $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "La columna delete_reason ya existe.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
