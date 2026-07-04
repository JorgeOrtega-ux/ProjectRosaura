-- Migración: Tablas de suscripciones y pagos para Stripe
-- Ejecutar manualmente: docker exec -i rosaura_db mysql -u root -p<ROOT_PASSWORD> db_identity < thisfile.sql

USE db_identity;

-- Columna stripe_customer_id en users (si no existe)
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'stripe_customer_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` VARCHAR(255) DEFAULT NULL AFTER `subscription_tier`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Tabla de suscripciones
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT(11) NOT NULL,
  `stripe_customer_id` VARCHAR(255) DEFAULT NULL,
  `stripe_subscription_id` VARCHAR(255) DEFAULT NULL,
  `stripe_checkout_session_id` VARCHAR(255) DEFAULT NULL,
  `tier` TINYINT(1) NOT NULL DEFAULT 0,
  `billing_period` ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  `status` ENUM('active', 'canceled', 'past_due', 'incomplete', 'trialing') NOT NULL DEFAULT 'incomplete',
  `current_period_start` DATETIME DEFAULT NULL,
  `current_period_end` DATETIME DEFAULT NULL,
  `canceled_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sub_user_id (`user_id`),
  INDEX idx_sub_stripe_customer (`stripe_customer_id`),
  INDEX idx_sub_stripe_subscription (`stripe_subscription_id`),
  INDEX idx_sub_checkout_session (`stripe_checkout_session_id`),
  CONSTRAINT fk_sub_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de historial de pagos
CREATE TABLE IF NOT EXISTS `payment_history` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT(11) NOT NULL,
  `stripe_payment_intent_id` VARCHAR(255) DEFAULT NULL,
  `stripe_invoice_id` VARCHAR(255) DEFAULT NULL,
  `amount_cents` INT NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'usd',
  `description` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('succeeded', 'pending', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ph_user (`user_id`),
  CONSTRAINT fk_ph_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
