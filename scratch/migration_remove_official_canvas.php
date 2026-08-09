<?php
/**
 * Migration Script: migration_remove_official_canvas.php
 * Removes is_official column and indices from the canvases table, and recreates updated indices.
 */

require_once __DIR__ . '/../vendor/autoload.php';
define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    echo "Initializing database migration to remove official canvas logic...\n";
    $db = new DatabaseManager();
    $pdo = $db->getConnection(DB::CONN_CANVASES);

    $table = DB::TBL_CANVASES; // 'canvases'

    // 1. Drop old indices if they exist
    $indicesToDrop = ['idx_canvases_privacy_official', 'idx_canvases_official_owner', 'idx_canvases_feed_opt'];
    foreach ($indicesToDrop as $index) {
        $stmt = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = '$index'");
        if ($stmt->fetch()) {
            echo "Dropping index '$index' from table '$table'...\n";
            $pdo->exec("ALTER TABLE `$table` DROP INDEX `$index`");
        } else {
            echo "Index '$index' does not exist.\n";
        }
    }

    // 2. Drop the column is_official if it exists
    $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE 'is_official'");
    if ($stmt->fetch()) {
        echo "Dropping column 'is_official' from table '$table'...\n";
        $pdo->exec("ALTER TABLE `$table` DROP COLUMN `is_official`");
    } else {
        echo "Column 'is_official' does not exist.\n";
    }

    // 3. Re-create new indices
    // Check and create idx_canvases_privacy on (privacy)
    $stmt = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = 'idx_canvases_privacy'");
    if (!$stmt->fetch()) {
        echo "Creating index 'idx_canvases_privacy' on table '$table'...\n";
        $pdo->exec("ALTER TABLE `$table` ADD INDEX `idx_canvases_privacy` (`privacy`)");
    } else {
        echo "Index 'idx_canvases_privacy' already exists.\n";
    }

    // Check and create idx_canvases_feed_opt on (is_subscription_locked, privacy, created_at)
    $stmt = $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = 'idx_canvases_feed_opt'");
    if (!$stmt->fetch()) {
        echo "Creating index 'idx_canvases_feed_opt' on table '$table'...\n";
        $pdo->exec("ALTER TABLE `$table` ADD INDEX `idx_canvases_feed_opt` (`is_subscription_locked`, `privacy`, `created_at`)");
    } else {
        echo "Index 'idx_canvases_feed_opt' already exists.\n";
    }

    echo "Migration completed successfully!\n";
} catch (\Throwable $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
