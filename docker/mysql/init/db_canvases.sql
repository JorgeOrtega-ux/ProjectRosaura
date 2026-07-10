-- docker/mysql/init/db_canvases.sql

CREATE DATABASE IF NOT EXISTS db_canvases;

USE db_canvases;

CREATE TABLE IF NOT EXISTS `canvases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `privacy` enum('public', 'private') DEFAULT 'private',
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `allow_purchases` tinyint(1) NOT NULL DEFAULT 1,
  `allow_chat` tinyint(1) NOT NULL DEFAULT 0,
  `size` varchar(20) NOT NULL DEFAULT '64',
  `palette_id` varchar(50) NOT NULL DEFAULT 'default',
  `max_participants` int(11) NOT NULL DEFAULT 10,
  `cooldown_pixels_batch` int(11) NOT NULL DEFAULT 5,
  `cooldown_seconds` int(11) NOT NULL DEFAULT 10,
  `favorites_count` int(11) NOT NULL DEFAULT 0,
  `scope_type` enum('personal', 'global', 'country', 'state', 'municipality', 'organization') NOT NULL DEFAULT 'personal',
  `scope_ref_1` varchar(100) DEFAULT NULL,
  `scope_ref_2` varchar(100) DEFAULT NULL,
  `scope_ref_3` varchar(100) DEFAULT NULL,
  `scope_hash` varchar(64) GENERATED ALWAYS AS (
      CASE 
          WHEN scope_type = 'personal' THEN uuid 
          ELSE MD5(CONCAT_WS('_', scope_type, IFNULL(scope_ref_1, ''), IFNULL(scope_ref_2, ''), IFNULL(scope_ref_3, '')))
      END
  ) STORED,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `idx_scope_hash` (`scope_hash`),
  INDEX `idx_owner_canvases` (`owner_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `canvas_id` int(11) DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `weight` int(11) NOT NULL DEFAULT 1,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cr_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `idx_canvas_role_name` (`canvas_id`, `name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_crp_role` FOREIGN KEY (`role_id`) REFERENCES `canvas_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_crp_permission` FOREIGN KEY (`permission_id`) REFERENCES `canvas_permissions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_user_roles` (
  `canvas_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  PRIMARY KEY (`canvas_id`, `user_id`, `role_id`),
  CONSTRAINT `fk_cur_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cur_role` FOREIGN KEY (`role_id`) REFERENCES `canvas_roles` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_members` (
  `canvas_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`canvas_id`, `user_id`),
  CONSTRAINT `fk_cm_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Insert base canvas roles (NULL canvas_id means system-wide base roles)
INSERT IGNORE INTO canvas_roles (id, canvas_id, name, weight, is_system) VALUES
  (1, NULL, 'Usuario', 1, 1),
  (2, NULL, 'Moderator', 50, 1),
  (3, NULL, 'Administrator', 80, 1),
  (4, NULL, 'SuperAdministrator', 100, 1);

-- Insert canvas permissions
INSERT IGNORE INTO canvas_permissions (id, name, description) VALUES
  (1, 'place_pixels', 'desc_place_pixels'),
  (2, 'manage_settings', 'desc_manage_settings'),
  (3, 'manage_members', 'desc_manage_members'),
  (4, 'manage_roles', 'desc_manage_roles'),
  (5, 'assign_roles', 'desc_assign_roles'),
  (6, 'view_history', 'desc_view_history'),
  (7, 'manage_resets', 'desc_manage_resets');

-- SuperAdministrator (Role 4): All permissions
INSERT IGNORE INTO canvas_role_permissions (role_id, permission_id) VALUES
  (4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7);

-- Administrator (Role 3): All except manage_roles
INSERT IGNORE INTO canvas_role_permissions (role_id, permission_id) VALUES
  (3, 1), (3, 2), (3, 3), (3, 5), (3, 6), (3, 7);

-- Moderator (Role 2): place_pixels, manage_members, view_history
INSERT IGNORE INTO canvas_role_permissions (role_id, permission_id) VALUES
  (2, 1), (2, 3), (2, 6);

-- Usuario (Role 1): place_pixels
INSERT IGNORE INTO canvas_role_permissions (role_id, permission_id) VALUES
  (1, 1);

CREATE TABLE IF NOT EXISTS `canvas_access_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `canvas_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('pending', 'approved', 'rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_canvas_user_req` (`canvas_id`, `user_id`),
  CONSTRAINT `fk_req_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- ==========================================
-- NUEVA TABLA PARA SISTEMA DE FAVORITOS
-- ==========================================

CREATE TABLE IF NOT EXISTS `canvas_favorites` (
  `canvas_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`canvas_id`, `user_id`),
  CONSTRAINT `fk_cf_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- ==========================================
-- TABLA PARA PERSISTENCIA (SNAPSHOTS)
-- ==========================================

CREATE TABLE IF NOT EXISTS `canvas_snapshots` (
  `canvas_id` int(11) NOT NULL,
  `snapshot_data` LONGBLOB NOT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`canvas_id`),
  CONSTRAINT `fk_snapshot_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- ==========================================
-- TABLA PARA CONFIGURACIÓN DE REINICIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS `canvas_reset_settings` (
  `canvas_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `next_reset_at` datetime DEFAULT NULL COMMENT 'Almacenado estrictamente en UTC',
  `take_snapshot` tinyint(1) NOT NULL DEFAULT 1,
  `timer_action` enum('restart', 'stop', 'none') DEFAULT 'restart',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`canvas_id`),
  CONSTRAINT `fk_reset_settings_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- ==========================================
-- TABLA NUEVA PARA CONFIGURACIÓN DE EXPANSIONES/REDUCCIONES
-- ==========================================

CREATE TABLE IF NOT EXISTS `canvas_resize_settings` (
  `canvas_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `next_resize_at` datetime DEFAULT NULL COMMENT 'Almacenado estrictamente en UTC',
  `target_size` varchar(20) NOT NULL DEFAULT '64',
  `timer_action` enum('restart', 'stop', 'none') DEFAULT 'restart',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`canvas_id`),
  CONSTRAINT `fk_resize_settings_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- ==========================================
-- TABLA PARA HISTORIAL DE REINICIOS (SNAPSHOTS)
-- ==========================================

CREATE TABLE IF NOT EXISTS `canvas_snapshots_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `canvas_id` int(11) NOT NULL,
  `snapshot_uuid` varchar(36) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `timelapse_file_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_snapshot_uuid` (`snapshot_uuid`),
  CONSTRAINT `fk_history_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- ==========================================
-- TABLA PARA LIBRERÍA DE PLANTILLAS DE USUARIO
-- ==========================================

CREATE TABLE IF NOT EXISTS `user_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  INDEX `idx_user_templates` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- ==========================================
-- TABLA PARA INVITACIONES DE LIENZOS
-- ==========================================

CREATE TABLE IF NOT EXISTS `canvas_invites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `canvas_id` INT(11) NOT NULL,
  `code` VARCHAR(10) NOT NULL UNIQUE,
  `role` VARCHAR(50) NOT NULL,
  `max_uses` INT NULL,
  `uses_count` INT DEFAULT 0,
  `expires_at` DATETIME NULL,
  `created_by` INT(11) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`canvas_id`) REFERENCES `canvases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- ASIGNACIÓN DE PERMISOS AL USUARIO DE LA API
-- ==========================================
GRANT ALL PRIVILEGES ON db_canvases.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;

-- ==========================================
-- TABLA PARA CHAT PREMIUM
-- ==========================================
CREATE TABLE IF NOT EXISTS `canvas_chat_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `canvas_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (`canvas_id`),
    INDEX (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `canvas_chat_restrictions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `canvas_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `restricted_by` varchar(36) NOT NULL,
  `suspension_type` enum('temporary','permanent') NOT NULL DEFAULT 'temporary',
  `suspension_reason` varchar(255) NOT NULL,
  `custom_reason` varchar(255) DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_canvas_user` (`canvas_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

