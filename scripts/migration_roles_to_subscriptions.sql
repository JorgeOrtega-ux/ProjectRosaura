-- SQL query to apply manually to an existing local database to migrate roles to subscription tiers

USE db_identity;

-- 1. Remove color from roles
ALTER TABLE roles DROP COLUMN color;

-- 2. Create subscription_tiers table
CREATE TABLE IF NOT EXISTS `subscription_tiers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) UNIQUE DEFAULT NULL,
  `tier_level` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_popular` tinyint(1) NOT NULL DEFAULT 0,
  `name` varchar(50) NOT NULL,
  `color` varchar(512) NOT NULL DEFAULT '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}',
  `stripe_price_id_monthly` varchar(255) DEFAULT NULL,
  `stripe_price_id_yearly` varchar(255) DEFAULT NULL,
  `price_monthly` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `price_yearly` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `max_canvases` INT NOT NULL DEFAULT 1,
  `max_storage_mb` INT NOT NULL DEFAULT 20,
  `max_snapshots_per_canvas` INT NOT NULL DEFAULT 10,
  `max_members_per_canvas` INT NOT NULL DEFAULT 10,
  `max_custom_palettes` INT NOT NULL DEFAULT 0,
  `feat_advanced_roles` tinyint(1) NOT NULL DEFAULT 0,
  `feat_chat_restriction` tinyint(1) NOT NULL DEFAULT 0,
  `feat_custom_palettes` tinyint(1) NOT NULL DEFAULT 0,
  `feat_priority_rendering` tinyint(1) NOT NULL DEFAULT 0,
  `feat_unlimited_exports` tinyint(1) NOT NULL DEFAULT 0,
  `feat_beta_access` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tier_level` (`tier_level`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- 3. Insert default tiers
INSERT IGNORE INTO subscription_tiers (id, uuid, tier_level, is_active, is_popular, name, color, stripe_price_id_monthly, stripe_price_id_yearly, price_monthly, price_yearly, max_canvases, max_storage_mb, max_snapshots_per_canvas, max_members_per_canvas, max_custom_palettes, feat_advanced_roles, feat_chat_restriction, feat_custom_palettes, feat_priority_rendering, feat_unlimited_exports, feat_beta_access) VALUES
  (1, NULL, 0, 1, 0, 'Basic', '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}', NULL, NULL, 0.00, 0.00, 1, 20, 10, 10, 0, 0, 0, 0, 0, 0, 0),
  (2, NULL, 1, 1, 0, 'Plus', '{"type":"solid","colors":[{"hex":"#28a745","percentage":100}]}', 'price_plus_monthly', 'price_plus_yearly', 4.99, 49.99, 3, 200, 25, 100, 0, 0, 0, 0, 0, 0, 0),
  (3, NULL, 2, 1, 1, 'Pro', '{"type":"solid","colors":[{"hex":"#fd7e14","percentage":100}]}', 'price_pro_monthly', 'price_pro_yearly', 9.99, 99.99, 10, 1000, 100, 2500, 5, 1, 1, 1, 0, 0, 0),
  (4, NULL, 3, 1, 0, 'Ultra', '{"type":"gradient","angle":0,"colors":[{"hex":"#ff0000","percentage":25},{"hex":"#0000ff","percentage":25},{"hex":"#00ff00","percentage":25},{"hex":"#ffff00","percentage":25}]}', 'price_ultra_monthly', 'price_ultra_yearly', 19.99, 199.99, 50, 5000, -1, 50000, 25, 1, 1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  color = VALUES(color);

