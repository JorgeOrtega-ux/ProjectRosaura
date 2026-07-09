<?php
require_once __DIR__ . '/includes/core/bootstrap.php';

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $dbManager = new DatabaseManager();
    $pdo = $dbManager->getConnection(DB::CONN_CANVASES);

    $pdo->exec("ALTER TABLE " . DB::TBL_CANVASES . " ADD COLUMN allow_chat TINYINT(1) DEFAULT 0;");
    echo "Columna allow_chat añadida a canvases.\n";

    $sql = "
    CREATE TABLE IF NOT EXISTS canvas_chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        canvas_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (canvas_id),
        INDEX (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    $pdo->exec($sql);
    echo "Tabla canvas_chat_messages creada.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
