<?php
/**
 * Migration Script: migration_clean_store.php
 * Cleans the database tables store_coin_packages and store_perk_packages.
 */

require_once __DIR__ . '/../vendor/autoload.php';
define('ROOT_PATH', dirname(__DIR__));
\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    echo "Initializing database migration...\n";
    $db = new DatabaseManager();
    $pdo = $db->getConnection(DB::CONN_IDENTITY);

    // 1. Modify store_coin_packages
    echo "Checking store_coin_packages table...\n";
    
    // Check if 'bonus_amount' column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM store_coin_packages LIKE 'bonus_amount'");
    $hasBonusAmount = (bool)$stmt->fetch();
    
    if (!$hasBonusAmount) {
        echo "Adding 'bonus_amount' column to store_coin_packages...\n";
        $pdo->exec("ALTER TABLE store_coin_packages ADD COLUMN bonus_amount INT NOT NULL DEFAULT 0 AFTER amount");
    } else {
        echo "'bonus_amount' column already exists.\n";
    }

    // Populate bonus_amount based on amount
    echo "Populating 'bonus_amount' for existing coin packages...\n";
    $pdo->exec("UPDATE store_coin_packages SET bonus_amount = 0 WHERE amount = 1000");
    $pdo->exec("UPDATE store_coin_packages SET bonus_amount = 750 WHERE amount = 2750");
    $pdo->exec("UPDATE store_coin_packages SET bonus_amount = 1250 WHERE amount = 5750");
    $pdo->exec("UPDATE store_coin_packages SET bonus_amount = 3250 WHERE amount = 13250");
    
    // Check and drop columns if they exist
    $columnsToDropCoins = ['name', 'description', 'bonus_text', 'icon', 'icon_color', 'border_color', 'badge_color'];
    foreach ($columnsToDropCoins as $col) {
        $stmt = $pdo->query("SHOW COLUMNS FROM store_coin_packages LIKE '$col'");
        if ($stmt->fetch()) {
            echo "Dropping column '$col' from store_coin_packages...\n";
            $pdo->exec("ALTER TABLE store_coin_packages DROP COLUMN `$col`");
        }
    }

    // 2. Modify store_perk_packages
    echo "Checking store_perk_packages table...\n";
    $columnsToDropPerks = ['name', 'description', 'icon'];
    foreach ($columnsToDropPerks as $col) {
        $stmt = $pdo->query("SHOW COLUMNS FROM store_perk_packages LIKE '$col'");
        if ($stmt->fetch()) {
            echo "Dropping column '$col' from store_perk_packages...\n";
            $pdo->exec("ALTER TABLE store_perk_packages DROP COLUMN `$col`");
        }
    }

    echo "Migration completed successfully!\n";
} catch (\Throwable $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
