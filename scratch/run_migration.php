<?php
$host = 'db_mysql';
$user = 'system_web_executor';
$pass = 'e4b3c2d1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3';

try {
    $pdo = new PDO("mysql:host=$host;dbname=db_canvases", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $cols = $pdo->query("SHOW COLUMNS FROM canvases")->fetchAll(PDO::FETCH_COLUMN);
    echo "Existing columns: " . implode(', ', $cols) . "\n";

    if (!in_array('mode', $cols)) {
        echo "Adding 'mode' column...\n";
        $pdo->exec("ALTER TABLE canvases ADD COLUMN `mode` ENUM('offline', 'online') NOT NULL DEFAULT 'offline'");
    }

    if (!in_array('is_online_active', $cols)) {
        echo "Adding 'is_online_active' column...\n";
        $pdo->exec("ALTER TABLE canvases ADD COLUMN `is_online_active` TINYINT(1) NOT NULL DEFAULT 0");
    }

    if (!in_array('storage_bytes', $cols)) {
        echo "Adding 'storage_bytes' column...\n";
        $pdo->exec("ALTER TABLE canvases ADD COLUMN `storage_bytes` BIGINT NOT NULL DEFAULT 0");
    }

    if (!in_array('last_online_at', $cols)) {
        echo "Adding 'last_online_at' column...\n";
        $pdo->exec("ALTER TABLE canvases ADD COLUMN `last_online_at` DATETIME NULL DEFAULT NULL");
    }

    // Check indexes
    $indexes = $pdo->query("SHOW INDEX FROM canvases")->fetchAll(PDO::FETCH_ASSOC);
    $indexNames = array_column($indexes, 'Key_name');
    if (!in_array('idx_canvases_mode_owner', $indexNames)) {
        echo "Adding 'idx_canvases_mode_owner' index...\n";
        $pdo->exec("ALTER TABLE canvases ADD INDEX `idx_canvases_mode_owner` (`owner_id`, `mode`, `is_online_active`)");
    }

    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Migration Error: " . $e->getMessage() . "\n";
}
