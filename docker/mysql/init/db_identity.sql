CREATE DATABASE IF NOT EXISTS db_identity;

USE db_identity;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `color` varchar(512) NOT NULL DEFAULT '{"type":"solid","colors":["#808080"]}',
  `weight` int(11) NOT NULL DEFAULT 1,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

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

INSERT IGNORE INTO roles (id, name, color, weight, is_system) VALUES
  (1, 'User', '{"type":"solid","colors":["#808080"]}', 1, 1),
  (2, 'Moderator', '{"type":"solid","colors":["#28a745"]}', 50, 1),
  (3, 'Administrator', '{"type":"solid","colors":["#fd7e14"]}', 80, 1),
  (4, 'SuperAdministrator', '{"type":"solid","colors":["#dc3545"]}', 100, 1);

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
  (22, 'canvases.create_official', 'desc_create_official', 1),
  (23, 'canvases.manage_official', 'desc_manage_official', 1);

INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8), (4, 9),
  (4, 10), (4, 11), (4, 12), (4, 13), (4, 14), (4, 15), (4, 16), (4, 17), (4, 18),
  (4, 19), (4, 20), (4, 21), (4, 22), (4, 23);

-- Administrador: Se le añaden 19, 20, 21, 22 y 23
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 8), (3, 10), (3, 13), (3, 17), 
  (3, 19), (3, 20), (3, 21), (3, 22), (3, 23);

-- Moderador: Se le añaden 19, 20 y 21
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (2, 1), (2, 2), (2, 4), (2, 5), (2, 6), (2, 19), (2, 20), (2, 21);

-- Usuario (User - Rol 1): Se le asignan permisos de lienzo
INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES
  (1, 19), (1, 20), (1, 21);

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `subscription_tier` tinyint(1) DEFAULT 0, -- NOTA DE IMPLEMENTACIÓN: Nuevo campo para el nivel de suscripción (0=Básico, 1=Pro, 2=Advanced)
  `two_factor_secret` varchar(64) DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `two_factor_recovery_codes` text DEFAULT NULL,
  `deletion_scheduled_at` datetime DEFAULT NULL,
  `profile_picture` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

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
  allowed_email_domains LONGTEXT DEFAULT NULL,
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
  maintenance_mode TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO server_config (id) SELECT 1 WHERE NOT EXISTS (SELECT * FROM server_config);