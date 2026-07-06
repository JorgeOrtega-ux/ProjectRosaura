<?php
require_once __DIR__ . '/../vendor/autoload.php';
\App\Core\Helpers\EnvLoader::load(__DIR__ . '/../.env');

use App\Config\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;

try {
    $dbManager = DatabaseManager::getInstance();
    $pdo = $dbManager->getConnection(DB::CONN_IDENTITY);
    
    $sql = "CREATE TABLE IF NOT EXISTS `user_perks` (
        `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT(11) NOT NULL,
        `perk_id` VARCHAR(100) NOT NULL,
        `coins_spent` INT NOT NULL DEFAULT 0,
        `is_used` TINYINT(1) NOT NULL DEFAULT 0,
        `used_at` DATETIME DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_perks_user (`user_id`),
        CONSTRAINT fk_user_perks_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql);
    echo "Table user_perks created successfully.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
