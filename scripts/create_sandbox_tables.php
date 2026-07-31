<?php
// scripts/create_sandbox_tables.php

require_once __DIR__ . '/../vendor/autoload.php';

define('ROOT_PATH', dirname(__DIR__));

\App\Core\Helpers\EnvLoader::load(ROOT_PATH . '/.env');

use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    echo "Connecting to canvases database...\n";
    $dbManager = new DatabaseManager();
    $pdo = $dbManager->getConnection(DB::CONN_CANVASES);
    
    echo "Creating user_sandboxes table...\n";
    $sql1 = "CREATE TABLE IF NOT EXISTS `user_sandboxes` (
      `uuid` varchar(36) NOT NULL,
      `user_id` int(11) NOT NULL,
      `name` varchar(100) NOT NULL,
      `width` int(11) NOT NULL DEFAULT 64,
      `height` int(11) NOT NULL DEFAULT 64,
      `palette_id` varchar(50) NOT NULL DEFAULT 'default',
      `cooldown_batch` int(11) NOT NULL DEFAULT 100,
      `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
      `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`uuid`),
      INDEX `idx_us_user` (`user_id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;";
    $pdo->exec($sql1);
    
    echo "Creating user_sandbox_chunks table...\n";
    $sql2 = "CREATE TABLE IF NOT EXISTS `user_sandbox_chunks` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `sandbox_uuid` varchar(36) NOT NULL,
      `chunk_key` varchar(10) NOT NULL,
      `data` LONGTEXT DEFAULT NULL,
      `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      UNIQUE KEY `idx_usc_sandbox_chunk` (`sandbox_uuid`, `chunk_key`),
      CONSTRAINT `fk_usc_sandbox` FOREIGN KEY (`sandbox_uuid`) REFERENCES `user_sandboxes` (`uuid`) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;";
    $pdo->exec($sql2);
    
    echo "Migration completed successfully!\n";
} catch (Throwable $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
