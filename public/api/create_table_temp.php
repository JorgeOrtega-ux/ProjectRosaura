<?php
require_once __DIR__ . '/../../includes/core/System/DB.php';
require_once __DIR__ . '/../../includes/core/System/DatabaseConstants.php';

try {
    $pdo = DB::getConnection();
    $sql = "CREATE TABLE IF NOT EXISTS `canvas_infinite_chunks` (
        `canvas_id` int(11) NOT NULL,
        `chunk_x` int(11) NOT NULL,
        `chunk_y` int(11) NOT NULL,
        `chunk_data` LONGBLOB NOT NULL,
        `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`canvas_id`, `chunk_x`, `chunk_y`),
        CONSTRAINT `fk_infinite_chunk_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;";
    
    $pdo->exec($sql);
    echo "OK: Table created.";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
