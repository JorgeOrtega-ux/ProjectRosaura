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
  (4, UUID(), 'SuperAdministrator', 100, 1),
  (5, UUID(), 'SupportAgentL1', 20, 1),
  (6, UUID(), 'SupportAgentL2', 40, 1),
  (7, UUID(), 'SupportAgentL3', 60, 1);

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
  (21, 'join_canvas', 'desc_join_canvas', 0),
  (22, 'view_dashboard', 'desc_view_dashboard', 0),
  (23, 'manage_subscriptions', 'desc_manage_subscriptions', 0),
  (24, 'manage_store_packages', 'desc_manage_store_packages', 0),
  (25, 'manage_store_perks', 'desc_manage_store_perks', 0),
  (26, 'manage_content', 'desc_manage_content', 0),
  (27, 'access_support_panel', 'desc_access_support_panel', 0),
  (28, 'support_chat_attend_l1', 'desc_support_chat_attend_l1', 0),
  (29, 'support_chat_attend_l2', 'desc_support_chat_attend_l2', 0),
  (30, 'support_chat_attend_l3', 'desc_support_chat_attend_l3', 0),
  (31, 'support_chat_escalate', 'desc_support_chat_escalate', 0),
  (32, 'support_chat_reassign', 'desc_support_chat_reassign', 1),
  (33, 'support_tickets_manage', 'desc_support_tickets_manage', 0),
  (34, 'support_manage_canned', 'desc_support_manage_canned', 0),
  (35, 'support_view_metrics', 'desc_support_view_metrics', 0),
  (36, 'support_audit_logs', 'desc_support_audit_logs', 1);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8), (4, 9),
  (4, 10), (4, 11), (4, 12), (4, 13), (4, 14), (4, 15), (4, 16), (4, 17), (4, 18),
  (4, 19), (4, 20), (4, 21), (4, 22), (4, 23), (4, 24), (4, 25), (4, 26),
  (4, 27), (4, 28), (4, 29), (4, 30), (4, 31), (4, 32), (4, 33), (4, 34), (4, 35), (4, 36);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 8), (3, 10), (3, 13), (3, 17), 
  (3, 19), (3, 20), (3, 21), (3, 22), (3, 23), (3, 24), (3, 25), (3, 26),
  (3, 27), (3, 28), (3, 29), (3, 30), (3, 31), (3, 32), (3, 33), (3, 34), (3, 35), (3, 36);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (2, 1), (2, 2), (2, 4), (2, 5), (2, 6), (2, 19), (2, 20), (2, 21), (2, 26);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (1, 19), (1, 20), (1, 21);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (5, 1), (5, 27), (5, 28), (5, 31), (5, 33), (5, 34);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (6, 1), (6, 2), (6, 27), (6, 28), (6, 29), (6, 31), (6, 33), (6, 34);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (7, 1), (7, 2), (7, 4), (7, 27), (7, 28), (7, 29), (7, 30), (7, 31), (7, 32), (7, 33), (7, 34), (7, 35), (7, 36);

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
  INDEX `idx_users_created_at` (`created_at`),
  INDEX `idx_users_stripe_customer` (`stripe_customer_id`)
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
    UNIQUE KEY `idx_user_palette` (`user_id`, `palette_key`),
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

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `subject` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_support_tickets_uuid` (`uuid`),
  KEY `idx_support_tickets_user_id` (`user_id`),
  KEY `idx_support_tickets_status` (`status`),
  KEY `idx_support_tickets_created_at` (`created_at`),
  CONSTRAINT `fk_support_tickets_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `user_id` INT(11) DEFAULT NULL,
  `department_level` ENUM('l1', 'l2', 'l3') NOT NULL DEFAULT 'l1',
  `status` ENUM('waiting_in_queue', 'active', 'escalated', 'closed', 'abandoned') NOT NULL DEFAULT 'waiting_in_queue',
  `assigned_agent_id` INT(11) DEFAULT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `language` VARCHAR(10) NOT NULL DEFAULT 'es-419',
  `subject` VARCHAR(200) NOT NULL,
  `initial_message` TEXT DEFAULT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `accepted_at` TIMESTAMP NULL DEFAULT NULL,
  `closed_at` TIMESTAMP NULL DEFAULT NULL,
  `closed_by` ENUM('user', 'agent', 'system', 'timeout') DEFAULT NULL,
  `resolution_summary` TEXT DEFAULT NULL,
  `user_rating` TINYINT DEFAULT NULL,
  `user_feedback` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scs_user_id` (`user_id`),
  KEY `idx_scs_agent_id` (`assigned_agent_id`),
  KEY `idx_scs_status_level` (`status`, `department_level`),
  KEY `idx_scs_created_at` (`created_at`),
  CONSTRAINT `fk_scs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_scs_agent` FOREIGN KEY (`assigned_agent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `sender_type` ENUM('user', 'agent', 'system', 'internal_note') NOT NULL,
  `sender_id` INT(11) DEFAULT NULL,
  `sender_name` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `attachments` JSON DEFAULT NULL,
  `is_internal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scm_session_id` (`session_id`),
  KEY `idx_scm_created_at` (`created_at`),
  CONSTRAINT `fk_scm_session` FOREIGN KEY (`session_id`) REFERENCES `support_chat_sessions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_scm_sender` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_chat_transfers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `from_agent_id` INT(11) DEFAULT NULL,
  `to_agent_id` INT(11) DEFAULT NULL,
  `from_level` ENUM('l1', 'l2', 'l3') NOT NULL,
  `to_level` ENUM('l1', 'l2', 'l3') NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `internal_note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sct_session_id` (`session_id`),
  CONSTRAINT `fk_sct_session` FOREIGN KEY (`session_id`) REFERENCES `support_chat_sessions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sct_from_agent` FOREIGN KEY (`from_agent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sct_to_agent` FOREIGN KEY (`to_agent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_agent_status` (
  `agent_id` INT(11) NOT NULL,
  `status` ENUM('online', 'busy', 'away', 'offline') NOT NULL DEFAULT 'offline',
  `current_active_chats` INT NOT NULL DEFAULT 0,
  `max_concurrent_chats` INT NOT NULL DEFAULT 3,
  `level` ENUM('l1', 'l2', 'l3') NOT NULL DEFAULT 'l1',
  `last_heartbeat` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`agent_id`),
  KEY `idx_sas_status_level` (`status`, `level`),
  CONSTRAINT `fk_sas_agent` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_canned_responses` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `shortcut` VARCHAR(50) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `content` TEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `language` VARCHAR(10) NOT NULL DEFAULT 'es-419',
  `min_level` ENUM('l1', 'l2', 'l3') NOT NULL DEFAULT 'l1',
  `created_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scr_category` (`category`),
  KEY `idx_scr_language` (`language`),
  CONSTRAINT `fk_scr_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `support_canned_responses` (`id`, `uuid`, `shortcut`, `title`, `content`, `category`, `language`, `min_level`) VALUES
  -- Español (Latinoamérica)
  (1, UUID(), 'saludo', 'Saludo Inicial de Soporte', '¡Hola! Gracias por comunicarte con el equipo de soporte técnico de Rosaura. ¿En qué podemos colaborarte hoy?', 'general', 'es-419', 'l1'),
  (2, UUID(), 'pedir_captura', 'Solicitud de Captura de Pantalla', 'Para poder analizar tu caso en detalle, ¿podrías adjuntarnos una captura o describir exactamente el paso a paso donde ocurre el error?', 'technical', 'es-419', 'l1'),
  (3, UUID(), 'escalar_l2', 'Aviso de Transferencia Especializada', 'He verificado tu caso y para brindarte una solución más ágil lo he transferido a un Especialista de Nivel 2. Por favor mantente en línea mientras revisamos tu expediente.', 'technical', 'es-419', 'l1'),
  (4, UUID(), 'escalar_l3', 'Aviso de Transferencia a Supervisión', 'Tu caso ha sido escalado al Departamento de Supervisión e Ingeniería (Nivel 3). Estamos investigando a fondo la incidencia en el servidor.', 'technical', 'es-419', 'l2'),
  (5, UUID(), 'despedida', 'Despedida y Cierre', 'Ha sido un placer ayudarte. Si tienes alguna otra duda o consulta adicional no dudes en escribirnos nuevamente. ¡Que tengas un excelente día!', 'general', 'es-419', 'l1'),

  -- Español (México)
  (6, UUID(), 'saludo', 'Saludo Inicial de Soporte', '¡Hola! Gracias por comunicarte con el equipo de soporte técnico de Rosaura. ¿En qué te podemos ayudar hoy?', 'general', 'es-MX', 'l1'),
  (7, UUID(), 'pedir_captura', 'Solicitud de Captura de Pantalla', 'Para analizar tu caso con mayor detalle, ¿nos podrías compartir una captura o explicar los pasos exactos donde se presenta la falla?', 'technical', 'es-MX', 'l1'),
  (8, UUID(), 'escalar_l2', 'Aviso de Transferencia Especializada', 'Revisé tu caso y para darte una solución rápida lo transferí con un Especialista de Nivel 2. Por favor mantente en línea mientras lo revisamos.', 'technical', 'es-MX', 'l1'),
  (9, UUID(), 'escalar_l3', 'Aviso de Transferencia a Supervisión', 'Tu caso fue escalado al Departamento de Supervisión e Ingeniería (Nivel 3). Estamos revisando la situación en el servidor.', 'technical', 'es-MX', 'l2'),
  (10, UUID(), 'despedida', 'Despedida y Cierre', 'Fue un gusto atenderte. Si tienes más dudas estamos para servirte. ¡Que tengas un excelente día!', 'general', 'es-MX', 'l1'),

  -- Español (España)
  (11, UUID(), 'saludo', 'Saludo Inicial de Soporte', '¡Hola! Gracias por contactar con el soporte técnico de Rosaura. ¿En qué te podemos ayudar hoy?', 'general', 'es-ES', 'l1'),
  (12, UUID(), 'pedir_captura', 'Solicitud de Captura de Pantalla', 'Para estudiar tu incidencia con detalle, ¿podrías facilitarnos una captura de pantalla o describir los pasos en los que sucede el error?', 'technical', 'es-ES', 'l1'),
  (13, UUID(), 'escalar_l2', 'Aviso de Transferencia Especializada', 'He revisado tu caso y lo he transferido a un Especialista de Nivel 2 para gestionarlo con mayor rapidez. Por favor, permanece a la espera.', 'technical', 'es-ES', 'l1'),
  (14, UUID(), 'escalar_l3', 'Aviso de Transferencia a Supervisión', 'Tu caso ha sido escalado al Departamento de Supervisión e Ingeniería (Nivel 3). Estamos analizando la incidencia técnica en el servidor.', 'technical', 'es-ES', 'l2'),
  (15, UUID(), 'despedida', 'Despedida y Cierre', 'Ha sido un placer ayudarte. Si necesitas cualquier otra cosa, no dudes en escribirnos de nuevo. ¡Un saludo cordial!', 'general', 'es-ES', 'l1'),

  -- English (United States)
  (16, UUID(), 'greeting', 'Initial Support Greeting', 'Hello! Thank you for reaching out to Rosaura technical support team. How may we assist you today?', 'general', 'en-US', 'l1'),
  (17, UUID(), 'request_screenshot', 'Request Screenshot / Details', 'In order to investigate your case in detail, could you please provide a screenshot or describe the exact steps where the error occurs?', 'technical', 'en-US', 'l1'),
  (18, UUID(), 'escalate_l2', 'Transfer to Tier 2 Support', 'I have reviewed your case and transferred it to a Tier 2 Support Specialist for faster resolution. Please stay on the line while we review your details.', 'technical', 'en-US', 'l1'),
  (19, UUID(), 'escalate_l3', 'Transfer to Supervision / Engineering', 'Your case has been escalated to Engineering and Supervision (Tier 3). We are investigating the server issue in depth.', 'technical', 'en-US', 'l2'),
  (20, UUID(), 'farewell', 'Farewell and Closure', 'It has been a pleasure assisting you. If you have any further questions, please do not hesitate to contact us again. Have a great day!', 'general', 'en-US', 'l1'),

  -- English (United Kingdom)
  (21, UUID(), 'greeting', 'Initial Support Greeting', 'Hello! Thank you for getting in touch with Rosaura technical support. How may we help you today?', 'general', 'en-GB', 'l1'),
  (22, UUID(), 'request_screenshot', 'Request Screenshot / Details', 'To help us investigate your enquiry thoroughly, could you please supply a screenshot or clarify the precise steps leading to the error?', 'technical', 'en-GB', 'l1'),
  (23, UUID(), 'escalate_l2', 'Transfer to Tier 2 Support', 'I have assessed your case and escalated it to a Tier 2 Specialist for priority resolution. Please kindly remain connected.', 'technical', 'en-GB', 'l1'),
  (24, UUID(), 'escalate_l3', 'Transfer to Supervision / Engineering', 'Your case has been escalated to our Engineering and Operations team (Tier 3). We are investigating the matter on the server.', 'technical', 'en-GB', 'l2'),
  (25, UUID(), 'farewell', 'Farewell and Closure', 'It has been our pleasure to assist you. If you require further assistance, please feel free to reach out. Have a wonderful day!', 'general', 'en-GB', 'l1'),

  -- Français (France)
  (26, UUID(), 'salutation', 'Salutation Initiale du Support', 'Bonjour ! Merci d''avoir contacté le support technique de Rosaura. Comment pouvons-nous vous aider aujourd''hui ?', 'general', 'fr-FR', 'l1'),
  (27, UUID(), 'demander_capture', 'Demande de Capture d''Écran', 'Afin d''analyser votre demande en détail, pourriez-vous nous transmettre une capture d''écran ou décrire les étapes exactes où l''erreur survient ?', 'technical', 'fr-FR', 'l1'),
  (28, UUID(), 'escalader_n2', 'Transfert vers Spécialiste Niveau 2', 'J''ai examiné votre dossier et l''ai transmis à un Spécialiste Niveau 2 pour un traitement plus rapide. Veuillez patienter en ligne.', 'technical', 'fr-FR', 'l1'),
  (29, UUID(), 'escalader_n3', 'Transfert vers Supervision et Ingénierie', 'Votre demande a été transmise à notre équipe d''ingénierie (Niveau 3). Nous étudions l''incident sur les serveurs.', 'technical', 'fr-FR', 'l2'),
  (30, UUID(), 'remerciement', 'Clôture et Remerciement', 'Ce fut un plaisir de vous aider. Si vous avez d''autres questions, n''hésitez pas à nous recontacter. Excellente journée à vous !', 'general', 'fr-FR', 'l1'),

  -- Deutsch (Deutschland)
  (31, UUID(), 'begruessung', 'Support-Begrüßung', 'Hallo! Vielen Dank, dass Sie sich an den technischen Support von Rosaura wenden. Wie können wir Ihnen heute helfen?', 'general', 'de-DE', 'l1'),
  (32, UUID(), 'screenshot_anfordern', 'Screenshot anfordern', 'Um Ihren Fall genau zu prüfen, senden Sie uns bitte einen Screenshot oder beschreiben Sie die genauen Schritte, bei denen der Fehler auftritt.', 'technical', 'de-DE', 'l1'),
  (33, UUID(), 'weiterleitung_l2', 'Weiterleitung an Level-2-Spezialisten', 'Ich habe Ihren Vorgang geprüft und an einen Level-2-Spezialisten weitergeleitet. Bitte bleiben Sie kurz in der Leitung.', 'technical', 'de-DE', 'l1'),
  (34, UUID(), 'weiterleitung_l3', 'Eskalation an Supervision / IT', 'Ihr Anliegen wurde an unser Engineering-Team (Level 3) eskaliert. Wir untersuchen das Problem auf dem Server.', 'technical', 'de-DE', 'l2'),
  (35, UUID(), 'verabschiedung', 'Abschluss und Verabschiedung', 'Es war uns ein Vergnügen, Ihnen zu helfen. Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung. Einen schönen Tag noch!', 'general', 'de-DE', 'l1'),

  -- Italiano (Italia)
  (36, UUID(), 'saluto', 'Saluto Iniziale Supporto', 'Ciao! Grazie per aver contattato l''assistenza tecnica di Rosaura. Come possiamo aiutarti oggi?', 'general', 'it-IT', 'l1'),
  (37, UUID(), 'richiesta_screenshot', 'Richiesta Screenshot / Dettagli', 'Per poter analizzare la tua richiesta in dettaglio, potresti allegare uno screenshot o descrivere i passaggi in cui si verifica l''errore?', 'technical', 'it-IT', 'l1'),
  (38, UUID(), 'trasferimento_l2', 'Trasferimento a Specialista Livello 2', 'Ho verificato il tuo caso e l''ho trasferito a uno Specialista di Livello 2 per una risoluzione rapida. Ti preghiamo di rimanere in linea.', 'technical', 'it-IT', 'l1'),
  (39, UUID(), 'trasferimento_l3', 'Trasferimento a Ingegneria / Livello 3', 'Il tuo caso è stato inoltrato al Reparto Ingegneria (Livello 3). Stiamo analizzando l''anomalia sul server.', 'technical', 'it-IT', 'l2'),
  (40, UUID(), 'congedo', 'Chiusura e Saluti', 'È stato un piacere aiutarti. Se hai altre domande, non esitare a contattarci di nuovo. Buona giornata!', 'general', 'it-IT', 'l1'),

  -- Português (Brasil)
  (41, UUID(), 'saudacao', 'Saudação Inicial de Suporte', 'Olá! Obrigado por entrar em contato com o suporte técnico da Rosaura. Como podemos ajudar você hoje?', 'general', 'pt-BR', 'l1'),
  (42, UUID(), 'pedir_print', 'Solicitação de Captura de Tela', 'Para que possamos analisar seu caso detalhadamente, você poderia nos enviar um print ou descrever o passo a passo exato do erro?', 'technical', 'pt-BR', 'l1'),
  (43, UUID(), 'escalar_n2', 'Transferência para Nível 2', 'Verifiquei seu caso e o transferi para um Especialista de Nível 2 para agilizar o atendimento. Por favor, aguarde em linha.', 'technical', 'pt-BR', 'l1'),
  (44, UUID(), 'escalar_n3', 'Transferência para Engenharia (Nível 3)', 'Seu caso foi encaminhado ao time de Engenharia e Supervisão (Nível 3). Estamos investigando a ocorrência no servidor.', 'technical', 'pt-BR', 'l2'),
  (45, UUID(), 'despedida', 'Encerramento e Despedida', 'Foi um prazer ajudar você! Se tiver qualquer outra dúvida, fique à vontade para nos chamar novamente. Tenha um excelente dia!', 'general', 'pt-BR', 'l1'),

  -- Português (Portugal)
  (46, UUID(), 'saudacao', 'Saudação Inicial de Suporte', 'Olá! Obrigado por contactar o suporte técnico da Rosaura. Em que lhe podemos ser úteis hoje?', 'general', 'pt-PT', 'l1'),
  (47, UUID(), 'pedir_captura', 'Solicitação de Captura de Ecrã', 'Para podermos analisar a sua questão em pormenor, poderia enviar-nos uma captura de ecrã ou descrever os passos exatos em que ocorre o erro?', 'technical', 'pt-PT', 'l1'),
  (48, UUID(), 'escalar_n2', 'Transferência para Nível 2', 'Analisei o seu caso e encaminhei-o para um Especialista de Nível 2 para um tratamento mais célere. Por favor, aguarde em linha.', 'technical', 'pt-PT', 'l1'),
  (49, UUID(), 'escalar_n3', 'Transferência para Engenharia (Nível 3)', 'O seu caso foi escalado para a equipa de Engenharia e Supervisão (Nível 3). Estamos a averiguar a anomalia no servidor.', 'technical', 'pt-PT', 'l2'),
  (50, UUID(), 'despedida', 'Encerramento e Despedida', 'Foi um gosto prestar-lhe assistência. Se necessitar de mais algum esclarecimento, não hesite em contactar-nos. Tenha um ótimo dia!', 'general', 'pt-PT', 'l1');




