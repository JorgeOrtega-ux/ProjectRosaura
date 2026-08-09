CREATE DATABASE IF NOT EXISTS db_identity;

USE db_identity;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) UNIQUE DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `weight` int(11) NOT NULL DEFAULT 1,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

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
  `feat_inject_templates` tinyint(1) NOT NULL DEFAULT 0,
  `feat_live_share` tinyint(1) NOT NULL DEFAULT 0,
  `max_template_tokens` INT NOT NULL DEFAULT 0,
  `max_upload_mb` INT NOT NULL DEFAULT 10,
  `max_pixels_per_batch` INT NOT NULL DEFAULT 5,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tier_level` (`tier_level`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
 
INSERT IGNORE INTO subscription_tiers (id, uuid, tier_level, is_active, is_popular, name, color, stripe_price_id_monthly, stripe_price_id_yearly, price_monthly, price_yearly, max_canvases, max_storage_mb, max_snapshots_per_canvas, max_members_per_canvas, max_custom_palettes, feat_advanced_roles, feat_chat_restriction, feat_custom_palettes, feat_priority_rendering, feat_unlimited_exports, feat_beta_access, feat_inject_templates, feat_live_share, max_template_tokens, max_upload_mb, max_pixels_per_batch) VALUES
  (1, '23bfb9b0-4f5d-4f1a-b6ef-9f9e2b17f5a1', 0, 1, 0, 'Basic', '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}', 'price_1TpZuHE4dfTcnyKKN5zBsSDl', 'price_1TpZuHE4dfTcnyKKN5zBsSDl', 0.00, 0.00, 1, 20, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 5),
  (2, '49bfa810-7b2c-4e81-a9f4-123456789abc', 1, 1, 0, 'Plus', '{"type":"solid","colors":[{"hex":"#28a745","percentage":100}]}', 'price_1TpZuHE4dfTcnyKKN5zBsSDl', 'price_1TpZuHE4dfTcnyKKN5zBsSDl', 4.99, 49.99, 3, 200, 25, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 25),
  (3, '1c9f2231-5f21-4d9a-b851-9f9f2f111222', 2, 1, 1, 'Pro', '{"type":"solid","colors":[{"hex":"#fd7e14","percentage":100}]}', 'price_1TpZuHE4dfTcnyKKN5zBsSDl', 'price_1TpZuHE4dfTcnyKKN5zBsSDl', 9.99, 99.99, 10, 1000, 100, 2500, 5, 1, 1, 1, 0, 0, 0, 0, 1, 0, 50, 50),
  (4, '87cf9a91-4c12-4d2c-a222-7f8f9a92231c', 3, 1, 0, 'Ultra', '{"type":"gradient","angle":295,"colors":[{"hex":"#E92D18","percentage":28},{"hex":"#306EE2","percentage":29},{"hex":"#249A41","percentage":28},{"hex":"#CD9308","percentage":15}]}', 'price_1TpZuHE4dfTcnyKKN5zBsSDl', 'price_1TpZuHE4dfTcnyKKN5zBsSDl', 19.99, 199.99, 50, 5000, -1, 50000, 25, 1, 1, 1, 1, 1, 1, 1, 1, 250, 100, 100);

CREATE TABLE IF NOT EXISTS `store_coin_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) UNIQUE DEFAULT NULL,
  `amount` INT NOT NULL DEFAULT 0,
  `bonus_amount` INT NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_popular` tinyint(1) NOT NULL DEFAULT 0,
  `price_usd` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stripe_price_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO `store_coin_packages` (`id`, `uuid`, `amount`, `bonus_amount`, `is_active`, `is_popular`, `price_usd`, `stripe_price_id`) VALUES
(1, '10000000-0000-0000-0000-000000001000', 1000, 0, 1, 0, 2.99, 'price_1Tq2JyE4dfTcnyKKhgS3IK9l'),
(2, '27500000-0000-0000-0000-000000002750', 2750, 750, 1, 1, 6.99, 'price_1Tq2KME4dfTcnyKK8LBoUUWT'),
(3, '57500000-0000-0000-0000-000000005750', 5750, 1250, 1, 1, 12.99, 'price_1Tq2KdE4dfTcnyKKY9DebxeP'),
(4, '13250000-0000-0000-0000-000000013250', 13250, 3250, 1, 1, 24.99, 'price_1Tq2L5E4dfTcnyKKa5FoxTj4');


CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_critical` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO roles (id, uuid, name, weight, is_system) VALUES
  (1, UUID(), 'User', 1, 1),
  (2, UUID(), 'Moderator', 50, 1),
  (3, UUID(), 'Administrator', 80, 1),
  (4, UUID(), 'SuperAdministrator', 100, 1);

INSERT IGNORE INTO permissions (id, name, description, is_critical) VALUES
  (1, 'access_admin_panel', 'desc_access_admin_panel', 0),
  (2, 'view_users', 'desc_view_users', 0),
  (3, 'edit_users', 'desc_edit_users', 0),
  (4, 'moderate_users', 'desc_moderate_users', 0),
  (5, 'view_kardex', 'desc_view_kardex', 0),
  (6, 'manage_kardex', 'desc_manage_kardex', 0),
  (7, 'delete_users', 'desc_delete_users', 1),
  (8, 'view_roles', 'desc_view_roles', 0),
  (9, 'manage_roles_structure', 'desc_manage_roles_structure', 1),
  (10, 'assign_roles', 'desc_assign_roles', 1),
  (11, 'manage_server_config', 'desc_manage_server_config', 1),
  (12, 'perform_system_maintenance', 'desc_perform_system_maintenance', 1),
  (13, 'create_backups', 'desc_create_backups', 0),
  (14, 'restore_backups', 'desc_restore_backups', 1),
  (15, 'delete_backups', 'desc_delete_backups', 1),
  (16, 'download_backups', 'desc_download_backups', 1),
  (17, 'view_logs', 'desc_view_logs', 0),
  (18, 'delete_logs', 'desc_delete_logs', 1),
  (19, 'create_canvas', 'desc_create_canvas', 0),
  (20, 'manage_canvases', 'desc_manage_canvases', 0),
  (21, 'join_canvas', 'desc_join_canvas', 0);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8), (4, 9),
  (4, 10), (4, 11), (4, 12), (4, 13), (4, 14), (4, 15), (4, 16), (4, 17), (4, 18),
  (4, 19), (4, 20), (4, 21);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 8), (3, 10), (3, 13), (3, 17), 
  (3, 19), (3, 20), (3, 21);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (2, 1), (2, 2), (2, 4), (2, 5), (2, 6), (2, 19), (2, 20), (2, 21);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (1, 19), (1, 20), (1, 21);

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `subscription_tier` tinyint(1) DEFAULT 0, -- NOTA DE IMPLEMENTACIÓN: Nuevo campo para el nivel de suscripción (0=Básico, 1=Pro, 2=Advanced)
  `coins` int(11) NOT NULL DEFAULT 0,
  `purchase_preference` ENUM('fast', 'verify') DEFAULT 'verify',
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `two_factor_secret` varchar(64) DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `two_factor_recovery_codes` text DEFAULT NULL,
  `deletion_scheduled_at` datetime DEFAULT NULL,
  `profile_picture` varchar(255) NOT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `storage_used_bytes` bigint(20) NOT NULL DEFAULT 0,
  `template_tokens_used` INT DEFAULT 0,
  `template_tokens_reset_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `google_id` (`google_id`),
  INDEX `idx_users_deletion_scheduled` (`deletion_scheduled_at`),
  INDEX `idx_users_tier` (`subscription_tier`),
  INDEX `idx_users_created_at` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  INDEX `idx_ur_role_id` (`role_id`),
  CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO `user_roles` (`user_id`, `role_id`) VALUES (1, 4);

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT(11) DEFAULT NULL,
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
  INDEX idx_sub_user_status (`user_id`, `status`),
  INDEX idx_sub_stripe_customer (`stripe_customer_id`),
  INDEX idx_sub_stripe_subscription (`stripe_subscription_id`),
  INDEX idx_sub_checkout_session (`stripe_checkout_session_id`),
  CONSTRAINT fk_sub_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_history` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT(11) DEFAULT NULL,
  `stripe_payment_intent_id` VARCHAR(255) DEFAULT NULL,
  `stripe_invoice_id` VARCHAR(255) DEFAULT NULL,
  `amount_cents` INT NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'usd',
  `description` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('succeeded', 'pending', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ph_user (`user_id`),
  INDEX idx_ph_user_created (`user_id`, `created_at` DESC),
  CONSTRAINT fk_ph_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `custom_palettes` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `palette_key` varchar(50) NOT NULL,
    `name` varchar(60) NOT NULL,
    `colors` JSON NOT NULL,
    `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_palette_key` (`palette_key`),
    KEY `idx_user_id` (`user_id`),
    CONSTRAINT `fk_custom_palettes_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_restrictions (
  user_id INT(11) NOT NULL PRIMARY KEY,
  is_suspended TINYINT(1) DEFAULT 0,
  suspension_type ENUM('temporary', 'permanent') DEFAULT NULL,
  suspension_reason TEXT DEFAULT NULL,
  suspension_end_date DATETIME DEFAULT NULL,
  deleted_by ENUM('user', 'admin') DEFAULT NULL,
  deleted_reason TEXT DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_restrictions_suspended (is_suspended, suspension_end_date),
  CONSTRAINT fk_user_restrictions FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS moderation_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL,
  admin_id INT(11) DEFAULT NULL,
  action_type VARCHAR(50) NOT NULL,
  reason TEXT DEFAULT NULL,
  end_date DATETIME DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mod_log_user_created (user_id, created_at DESC),
  INDEX idx_mod_log_admin (admin_id),
  CONSTRAINT fk_mod_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mod_log_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS profile_changes_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL,
  change_type ENUM('avatar', 'username', 'email', 'password', '2fa') NOT NULL,
  old_value VARCHAR(255) DEFAULT NULL,
  new_value VARCHAR(255) DEFAULT NULL,
  ip_address VARCHAR(45) NOT NULL,
  asn VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_change_date (user_id, change_type, created_at),
  INDEX idx_user_created (user_id, created_at),
  CONSTRAINT fk_user_profile_log FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL,
  language VARCHAR(10) DEFAULT 'en-US',
  open_links_new_tab TINYINT(1) DEFAULT 1,
  theme ENUM('system', 'light', 'dark') DEFAULT 'system',
  extended_alerts TINYINT(1) DEFAULT 0,
  allow_telemetry TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id),
  CONSTRAINT fk_user_preferences FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_flags` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT(11) NOT NULL,
  `flag_key` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_flag` (`user_id`, `flag_key`),
  CONSTRAINT `fk_user_flags_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL,
  selector VARCHAR(255) NOT NULL,
  hashed_validator VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  location VARCHAR(255) DEFAULT NULL,
  asn VARCHAR(255) DEFAULT NULL,
  CONSTRAINT fk_user_tokens FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (selector),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_expires (user_id, expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS server_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  min_password_length INT NOT NULL DEFAULT 8,
  max_password_length INT NOT NULL DEFAULT 64,
  min_username_length INT NOT NULL DEFAULT 3,
  max_username_length INT NOT NULL DEFAULT 32,
  max_avatar_size_mb INT NOT NULL DEFAULT 2,
  session_lifetime_minutes INT NOT NULL DEFAULT 120,
  max_active_sessions_per_user INT NOT NULL DEFAULT 3,
  allow_registrations TINYINT(1) NOT NULL DEFAULT 1,
  allowed_email_domains VARCHAR(2048) NOT NULL DEFAULT 'gmail.com,outlook.com,hotmail.com',
  registration_rate_limit_attempts INT NOT NULL DEFAULT 5,
  registration_rate_limit_minutes INT NOT NULL DEFAULT 15,
  verification_code_minutes INT NOT NULL DEFAULT 15,
  password_reset_minutes INT NOT NULL DEFAULT 15,
  remember_me_days INT NOT NULL DEFAULT 30,
  default_user_role_id INT NOT NULL DEFAULT 1,
  email_code_request_attempts INT NOT NULL DEFAULT 3,
  email_code_request_minutes INT NOT NULL DEFAULT 30,
  prefs_update_rate_limit_attempts INT NOT NULL DEFAULT 20,
  prefs_update_rate_limit_minutes INT NOT NULL DEFAULT 5,
  security_verify_attempts INT NOT NULL DEFAULT 5,
  security_verify_minutes INT NOT NULL DEFAULT 15,
  password_update_rate_limit_attempts INT NOT NULL DEFAULT 5,
  password_update_rate_limit_minutes INT NOT NULL DEFAULT 15,
  username_change_cooldown_days INT NOT NULL DEFAULT 7,
  username_change_max_attempts INT NOT NULL DEFAULT 1,
  email_change_cooldown_days INT NOT NULL DEFAULT 7,
  email_change_max_attempts INT NOT NULL DEFAULT 1,
  avatar_change_cooldown_days INT NOT NULL DEFAULT 1,
  avatar_change_max_attempts INT NOT NULL DEFAULT 3,
  login_rate_limit_attempts INT NOT NULL DEFAULT 5,
  login_rate_limit_minutes INT NOT NULL DEFAULT 15,
  forgot_password_rate_limit_attempts INT NOT NULL DEFAULT 3,
  forgot_password_rate_limit_minutes INT NOT NULL DEFAULT 30,
  admin_edit_avatar_attempts INT NOT NULL DEFAULT 20,
  admin_edit_avatar_minutes INT NOT NULL DEFAULT 30,
  admin_edit_username_attempts INT NOT NULL DEFAULT 20,
  admin_edit_username_minutes INT NOT NULL DEFAULT 30,
  admin_edit_email_attempts INT NOT NULL DEFAULT 20,
  admin_edit_email_minutes INT NOT NULL DEFAULT 30,
  admin_edit_prefs_attempts INT NOT NULL DEFAULT 50,
  admin_edit_prefs_minutes INT NOT NULL DEFAULT 30,
  admin_edit_role_attempts INT NOT NULL DEFAULT 10,
  admin_edit_role_minutes INT NOT NULL DEFAULT 30,
  admin_delete_user_attempts INT NOT NULL DEFAULT 20,
  admin_delete_user_minutes INT NOT NULL DEFAULT 30,
  admin_add_note_attempts INT NOT NULL DEFAULT 30,
  admin_add_note_minutes INT NOT NULL DEFAULT 30,
  admin_read_data_attempts INT NOT NULL DEFAULT 120,
  admin_edit_status_attempts INT NOT NULL DEFAULT 20,
  admin_edit_status_minutes INT NOT NULL DEFAULT 30,
  admin_read_data_minutes INT NOT NULL DEFAULT 1,
  admin_password_verify_attempts INT NOT NULL DEFAULT 5,
  admin_password_verify_minutes INT NOT NULL DEFAULT 15,
  admin_redis_read_attempts INT NOT NULL DEFAULT 30,
  admin_redis_read_minutes INT NOT NULL DEFAULT 1,
  admin_redis_delete_attempts INT NOT NULL DEFAULT 100,
  admin_redis_delete_minutes INT NOT NULL DEFAULT 1,
  admin_flush_redis_sessions_attempts INT NOT NULL DEFAULT 5,
  admin_flush_redis_sessions_minutes INT NOT NULL DEFAULT 5,
  admin_backup_create_attempts INT NOT NULL DEFAULT 5,
  admin_backup_create_minutes INT NOT NULL DEFAULT 30,
  admin_backup_restore_attempts INT NOT NULL DEFAULT 3,
  admin_backup_restore_minutes INT NOT NULL DEFAULT 30,
  auto_backup_enabled TINYINT(1) NOT NULL DEFAULT 0,
  auto_backup_frequency_hours INT NOT NULL DEFAULT 24,
  auto_backup_retention_count INT NOT NULL DEFAULT 5,
  backup_schema_config LONGTEXT DEFAULT NULL,
  verification_code_expiration_minutes INT NOT NULL DEFAULT 15,
  password_reset_expiration_minutes INT NOT NULL DEFAULT 15,
  maintenance_mode TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO server_config (id) SELECT 1 WHERE NOT EXISTS (SELECT * FROM server_config);

CREATE TABLE IF NOT EXISTS `store_purchases` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT(11) DEFAULT NULL,
  `stripe_payment_intent_id` VARCHAR(255) DEFAULT NULL,
  `stripe_checkout_session_id` VARCHAR(255) DEFAULT NULL,
  `item_type` VARCHAR(50) NOT NULL, -- e.g., 'coins'
  `item_amount` INT NOT NULL, -- e.g., 1000
  `amount_cents` INT NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'usd',
  `status` ENUM('succeeded', 'pending', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_store_purchases_user (`user_id`),
  INDEX idx_sp_user_created (`user_id`, `created_at` DESC),
  UNIQUE INDEX idx_store_purchases_session (`stripe_checkout_session_id`),
  CONSTRAINT fk_store_purchases_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_perks` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT(11) NOT NULL,
  `perk_id` VARCHAR(100) NOT NULL,
  `coins_spent` INT NOT NULL DEFAULT 0,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_perks_user (`user_id`),
  INDEX idx_user_perk_active (`user_id`, `perk_id`, `is_used`),
  CONSTRAINT fk_user_perks_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_perk_balances` (
  `user_id` INT(11) NOT NULL,
  `perk_id` VARCHAR(100) NOT NULL,
  `quantity_available` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `perk_id`),
  CONSTRAINT fk_user_perk_balances_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `store_perk_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) UNIQUE DEFAULT NULL,
  `perk_id` VARCHAR(100) UNIQUE NOT NULL,
  `price_coins` INT NOT NULL DEFAULT 0,
  `is_single_use` tinyint(1) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO `store_perk_packages` (uuid, perk_id, price_coins, is_single_use, is_active) VALUES
('e0000000-0000-0000-0000-000000000002', 'pixel_missile_1', 500, 1, 1),
('e0000000-0000-0000-0000-000000000003', 'pixel_bomb_1', 1000, 1, 1),
('e0000000-0000-0000-0000-000000000004', 'cluster_bomb_1', 2500, 1, 1),
('e0000000-0000-0000-0000-000000000005', 'atomic_bomb_1', 5000, 1, 1),
('e0000000-0000-0000-0000-000000000006', 'meteor_shower_1', 10000, 1, 1),
('e0000000-0000-0000-0000-000000000007', 'orbital_cannon_1', 15000, 1, 1),
('e0000000-0000-0000-0000-000000000008', 'black_hole_1', 20000, 1, 1),
('e0000000-0000-0000-0000-000000000009', 'mines_1', 1500, 1, 1),
('e0000000-0000-0000-0000-000000000010', 'supernova_blast', 12000, 1, 1),
('e0000000-0000-0000-0000-000000000011', 'ion_strike', 8000, 1, 1);

CREATE TABLE IF NOT EXISTS `user_coin_transactions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `user_id` INT(11) NOT NULL,
  `amount` INT NOT NULL,
  `type` ENUM('charge', 'spend', 'refund', 'bonus', 'admin_adjustment') NOT NULL,
  `reference_table` VARCHAR(50) DEFAULT NULL,
  `reference_id` BIGINT DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uct_user (`user_id`),
  INDEX idx_uct_user_created (`user_id`, `created_at` DESC),
  INDEX idx_uct_ref (`reference_table`, `reference_id`),
  CONSTRAINT fk_uct_user FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


