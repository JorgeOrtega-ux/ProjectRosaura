<?php
require __DIR__ . '/../vendor/autoload.php';

$appRoot = dirname(__DIR__);
$dotenv = Dotenv\Dotenv::createImmutable($appRoot);
$dotenv->load();

$db = new \App\Config\Database\DatabaseManager();
$pdo = $db->getConnection(\App\Core\System\DatabaseConstants::CONN_IDENTITY);

$sql = "
CREATE TABLE IF NOT EXISTS `store_coin_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) UNIQUE DEFAULT NULL,
  `amount` INT NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_popular` tinyint(1) NOT NULL DEFAULT 0,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `price_usd` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `bonus_text` varchar(100) DEFAULT NULL,
  `icon` varchar(50) DEFAULT 'monetization_on',
  `icon_color` varchar(50) DEFAULT NULL,
  `border_color` varchar(50) DEFAULT NULL,
  `badge_color` varchar(50) DEFAULT NULL,
  `stripe_price_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO `store_coin_packages` (`id`, `uuid`, `amount`, `is_active`, `is_popular`, `name`, `description`, `price_usd`, `bonus_text`, `icon`, `icon_color`, `border_color`, `badge_color`, `stripe_price_id`) VALUES
(1, '10000000-0000-0000-0000-000000001000', 1000, 1, 0, 'store_coins_1000_name', 'store_coins_1000_desc', 2.99, NULL, 'monetization_on', NULL, NULL, NULL, 'price_1Tq2JyE4dfTcnyKKhgS3IK9l'),
(2, '27500000-0000-0000-0000-000000002750', 2750, 1, 1, 'store_coins_2750_name', 'store_coins_2750_desc', 6.99, 'store_coins_2750_bonus', 'monetization_on', NULL, NULL, NULL, 'price_1Tq2KME4dfTcnyKK8LBoUUWT'),
(3, '57500000-0000-0000-0000-000000005750', 5750, 1, 1, 'store_coins_5750_name', 'store_coins_5750_desc', 12.99, 'store_coins_5750_bonus', 'diamond', NULL, NULL, 'var(--color-success)', 'price_1Tq2KdE4dfTcnyKKY9DebxeP'),
(4, '13250000-0000-0000-0000-000000013250', 13250, 1, 1, 'store_coins_13250_name', 'store_coins_13250_desc', 24.99, 'store_coins_13250_bonus', 'workspace_premium', '#8b5cf6', '#8b5cf6', '#8b5cf6', 'price_1Tq2L5E4dfTcnyKKa5FoxTj4');
";

$pdo->exec($sql);
echo "Database updated.\n";
