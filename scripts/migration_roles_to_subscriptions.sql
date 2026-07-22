-- SQL query to apply manually to an existing local database to migrate roles to subscription tiers

USE db_identity;

-- 1. Remove color from roles
ALTER TABLE roles DROP COLUMN color;

-- 2. Create subscription_tiers table
CREATE TABLE IF NOT EXISTS `subscription_tiers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tier_level` tinyint(1) NOT NULL DEFAULT 0,
  `name` varchar(50) NOT NULL,
  `color` varchar(512) NOT NULL DEFAULT '{"type":"solid","colors":["#808080"]}',
  `stripe_price_id_monthly` varchar(255) DEFAULT NULL,
  `stripe_price_id_yearly` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tier_level` (`tier_level`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- 3. Insert default tiers
INSERT IGNORE INTO subscription_tiers (id, tier_level, name, color, stripe_price_id_monthly, stripe_price_id_yearly) VALUES
  (1, 0, 'Basic', '{"type":"solid","colors":["#808080"]}', NULL, NULL),
  (2, 1, 'Pro', '{"type":"gradient","angle":90,"colors":[{"hex":"#d32029","percentage":50},{"hex":"#206bd3","percentage":50}]}', 'price_pro_monthly', 'price_pro_yearly'),
  (3, 2, 'Advanced', '{"type":"gradient","angle":45,"colors":[{"hex":"#fd7e14","percentage":50},{"hex":"#ffc107","percentage":50}]}', 'price_adv_monthly', 'price_adv_yearly');
