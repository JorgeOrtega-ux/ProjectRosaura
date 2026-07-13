<?php
require_once __DIR__ . '/includes/core/bootstrap.php';

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $db = (new DatabaseManager())->getConnection(DB::CONN_CANVASES);
    
    // Add privacy column to canvas_snapshots_history
    $db->exec("ALTER TABLE `canvas_snapshots_history` ADD COLUMN `privacy` ENUM('public', 'private') NOT NULL DEFAULT 'public' AFTER `timelapse_file_path`");
    
    // Create canvas_snapshots_likes table
    $db->exec("CREATE TABLE IF NOT EXISTS `canvas_snapshots_likes` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `snapshot_id` int(11) NOT NULL,
        `user_id` int(11) NOT NULL,
        `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (`id`),
        UNIQUE KEY `idx_snapshot_user` (`snapshot_id`, `user_id`),
        CONSTRAINT `fk_like_snapshot` FOREIGN KEY (`snapshot_id`) REFERENCES `canvas_snapshots_history` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;");

    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
