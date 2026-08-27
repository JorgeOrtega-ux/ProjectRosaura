
CREATE DATABASE IF NOT EXISTS db_canvases;

USE db_canvases;

CREATE TABLE IF NOT EXISTS `canvases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `owner_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `tags` json DEFAULT NULL,
  `privacy` enum('public', 'private') DEFAULT 'private',
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `allow_chat` tinyint(1) NOT NULL DEFAULT 0,
  `is_subscription_locked` tinyint(1) NOT NULL DEFAULT 0,
  `locked_reasons` json DEFAULT NULL,
  `size` varchar(20) NOT NULL DEFAULT '64',
  `palette_id` varchar(50) NOT NULL DEFAULT 'default',
  `max_participants` int(11) NOT NULL DEFAULT 10,
  `cooldown_pixels_batch` int(11) NOT NULL DEFAULT 5,
  `cooldown_seconds` int(11) NOT NULL DEFAULT 10,
  `favorites_count` int(11) NOT NULL DEFAULT 0,
  `members_count` int(11) NOT NULL DEFAULT 0,
  `total_pixels` bigint(20) NOT NULL DEFAULT 0,
  `total_messages` bigint(20) NOT NULL DEFAULT 0,
  `is_frozen` tinyint(1) NOT NULL DEFAULT 0,
  `mode` enum('offline', 'online') NOT NULL DEFAULT 'offline',
  `is_online_active` tinyint(1) NOT NULL DEFAULT 0,
  `storage_bytes` bigint(20) NOT NULL DEFAULT 0,
  `last_online_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL COMMENT 'NULL = activo, NOT NULL = en papelera',
  `deleted_by_user_id` int(11) DEFAULT NULL COMMENT 'Usuario que lo envió a la papelera',
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  INDEX `idx_owner_canvases` (`owner_id`),
  INDEX `idx_canvases_privacy` (`privacy`),
  INDEX `idx_canvases_feed_opt` (`is_subscription_locked`, `privacy`, `created_at`),
  INDEX `idx_canvases_popular` (`favorites_count` DESC, `created_at` DESC),
  INDEX `idx_canvases_tags` ((CAST(tags AS CHAR(32) ARRAY))),
  INDEX `idx_canvases_mode_owner` (`owner_id`, `mode`, `is_online_active`),
  INDEX `idx_canvases_deleted` (`deleted_at`),
  INDEX `idx_canvases_deleted_by` (`deleted_by_user_id`),
  INDEX `idx_canvases_palette` (`palette_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_protections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `canvas_id` int(11) NOT NULL,
  `x1` int(11) NOT NULL,
  `y1` int(11) NOT NULL,
  `x2` int(11) NOT NULL,
  `y2` int(11) NOT NULL,
  `protected_by` int(11) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  INDEX `idx_cp_canvas` (`canvas_id`),
  INDEX `idx_cp_canvas_expires` (`canvas_id`, `expires_at`),
  CONSTRAINT `fk_cp_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `canvas_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) UNIQUE DEFAULT NULL,
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
  INDEX `idx_cur_user` (`user_id`),
  INDEX `idx_cur_role` (`role_id`),
  CONSTRAINT `fk_cur_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cur_role` FOREIGN KEY (`role_id`) REFERENCES `canvas_roles` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_members` (
  `canvas_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`canvas_id`, `user_id`),
  INDEX `idx_cm_user_joined` (`user_id`, `joined_at` DESC),
  CONSTRAINT `fk_cm_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO canvas_roles (id, uuid, canvas_id, name, weight, is_system) VALUES
  (1, UUID(), NULL, 'Usuario', 1, 1),
  (2, UUID(), NULL, 'Moderator', 50, 1),
  (3, UUID(), NULL, 'Administrator', 80, 1),
  (4, UUID(), NULL, 'SuperAdministrator', 100, 1);

INSERT IGNORE INTO canvas_permissions (id, name, description) VALUES
  (1, 'place_pixels', 'desc_place_pixels'),
  (2, 'manage_settings', 'desc_manage_settings'),
  (3, 'manage_members', 'desc_manage_members'),
  (4, 'manage_roles', 'desc_manage_roles'),
  (5, 'assign_roles', 'desc_assign_roles'),
  (6, 'view_history', 'desc_view_history'),
  (7, 'manage_resets', 'desc_manage_resets'),
  (8, 'manage_sanctions', 'desc_manage_sanctions'),
  (9, 'manage_invites', 'desc_manage_invites'),
  (10, 'create_snapshots', 'desc_create_snapshots');

INSERT IGNORE INTO canvas_role_permissions (role_id, permission_id) VALUES
  (4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8), (4, 9), (4, 10);

INSERT IGNORE INTO canvas_role_permissions (role_id, permission_id) VALUES
  (3, 1), (3, 2), (3, 3), (3, 5), (3, 6), (3, 7), (3, 8), (3, 9);

INSERT IGNORE INTO canvas_role_permissions (role_id, permission_id) VALUES
  (2, 1), (2, 3), (2, 6);

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
  INDEX `idx_car_status` (`canvas_id`, `status`),
  CONSTRAINT `fk_req_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `canvas_favorites` (
  `canvas_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`canvas_id`, `user_id`),
  INDEX `idx_user_created` (`user_id`, `created_at` DESC),
  CONSTRAINT `fk_cf_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `canvas_snapshots` (
  `canvas_id` int(11) NOT NULL,
  `s3_key` varchar(255) DEFAULT NULL,
  `snapshot_data` LONGBLOB DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`canvas_id`),
  CONSTRAINT `fk_snapshot_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `canvas_layers` (
  `canvas_id` int(11) NOT NULL,
  `s3_key` varchar(255) DEFAULT NULL,
  `layers_data` LONGBLOB DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`canvas_id`),
  CONSTRAINT `fk_layers_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `canvas_reset_settings` (
  `canvas_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `next_reset_at` datetime DEFAULT NULL COMMENT 'Almacenado estrictamente en UTC',
  `take_snapshot` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`canvas_id`),
  INDEX `idx_crs_active_next` (`is_active`, `next_reset_at`),
  CONSTRAINT `fk_reset_settings_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `canvas_resize_settings` (
  `canvas_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `next_resize_at` datetime DEFAULT NULL COMMENT 'Almacenado estrictamente en UTC',
  `target_size` varchar(20) NOT NULL DEFAULT '64',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`canvas_id`),
  INDEX `idx_cres_active_next` (`is_active`, `next_resize_at`),
  CONSTRAINT `fk_resize_settings_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `canvas_snapshots_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `canvas_id` int(11) NOT NULL,
  `snapshot_uuid` varchar(36) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `timelapse_path` varchar(255) DEFAULT NULL,
  `privacy` ENUM('public', 'private') NOT NULL DEFAULT 'public',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_snapshot_uuid` (`snapshot_uuid`),
  INDEX `idx_csh_canvas_created` (`canvas_id`, `created_at` DESC),
  INDEX `idx_csh_privacy` (`privacy`, `created_at` DESC),
  CONSTRAINT `fk_history_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_snapshots_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `snapshot_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_snapshot_user` (`snapshot_id`, `user_id`),
  INDEX `idx_csl_user` (`user_id`),
  CONSTRAINT `fk_like_snapshot` FOREIGN KEY (`snapshot_id`) REFERENCES `canvas_snapshots_history` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS `user_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_size` bigint(20) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL COMMENT 'NULL = activo, NOT NULL = en papelera',
  PRIMARY KEY (`id`),
  INDEX `idx_user_templates` (`user_id`),
  INDEX `idx_user_templates_deleted` (`deleted_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;


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
  INDEX `idx_ci_canvas` (`canvas_id`),
  INDEX `idx_ci_created_by` (`created_by`),
  INDEX `idx_ci_expires` (`expires_at`),
  FOREIGN KEY (`canvas_id`) REFERENCES `canvases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON db_canvases.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS `canvas_chat_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(36) NOT NULL UNIQUE,
    `canvas_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `message` TEXT NOT NULL,
    `attachments` JSON DEFAULT NULL,
    `file_size` BIGINT(20) NOT NULL DEFAULT 0,
    `visibility` ENUM('visible','under_review','deleted') NOT NULL DEFAULT 'visible',
    `deleted_by` VARCHAR(50) DEFAULT NULL,
    `delete_reason` TEXT DEFAULT NULL,
    `reply_to` VARCHAR(36) DEFAULT NULL,
    `reply_to_username` VARCHAR(50) DEFAULT NULL,
    `reply_to_message` TEXT DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (`canvas_id`),
    INDEX (`created_at`),
    INDEX `idx_chat_canvas_vis_id` (`canvas_id`, `visibility`, `id` DESC),
    INDEX `idx_chat_user` (`user_id`),
    INDEX `idx_canvas_id_desc` (`canvas_id`, `id` DESC),
    CONSTRAINT `fk_ccm_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `canvas_sanctions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `canvas_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `restricted_by` varchar(36) NOT NULL,
  `sanction_scope` varchar(50) NOT NULL DEFAULT 'chat_mute',
  `suspension_type` enum('temporary','permanent') NOT NULL DEFAULT 'temporary',
  `suspension_reason` varchar(255) NOT NULL,
  `custom_reason` varchar(255) DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_canvas_user_scope` (`canvas_id`,`user_id`,`sanction_scope`),
  INDEX `idx_ccr_end_date` (`end_date`),
  INDEX `idx_cs_user_end` (`user_id`, `end_date`),
  INDEX `idx_cs_canvas_scope` (`canvas_id`, `sanction_scope`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `canvas_chat_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_id` VARCHAR(36) NOT NULL,
  `reporter_user_id` INT NOT NULL,
  `reason_key` VARCHAR(50) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'reviewed', 'dismissed') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`message_id`),
  INDEX (`reporter_user_id`),
  INDEX (`created_at`),
  INDEX `idx_reports_status_date` (`status`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `canvas_recent_colors` (
  `user_id` int(11) NOT NULL,
  `canvas_id` int(11) NOT NULL,
  `colors` json NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`, `canvas_id`),
  INDEX `idx_recent_colors_canvas` (`canvas_id`),
  CONSTRAINT `fk_crc_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `publications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `canvas_id` INT(11) DEFAULT NULL,
  `title` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `image_path` VARCHAR(255) NOT NULL,
  `width` INT(11) NOT NULL DEFAULT 64,
  `height` INT(11) NOT NULL DEFAULT 64,
  `palette_id` VARCHAR(50) DEFAULT 'default',
  `likes_count` INT(11) NOT NULL DEFAULT 0,
  `views_count` INT(11) NOT NULL DEFAULT 0,
  `comments_count` INT(11) NOT NULL DEFAULT 0,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `privacy` ENUM('public', 'unlisted', 'private') NOT NULL DEFAULT 'public',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pub_uuid` (`uuid`),
  INDEX `idx_pub_user` (`user_id`, `created_at` DESC),
  INDEX `idx_pub_privacy_created` (`privacy`, `created_at` DESC),
  INDEX `idx_pub_popular` (`likes_count` DESC, `created_at` DESC),
  INDEX `idx_pub_canvas` (`canvas_id`),
  INDEX `idx_pub_palette` (`palette_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `publication_likes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `publication_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pub_user_like` (`publication_id`, `user_id`),
  INDEX `idx_pub_likes_user` (`user_id`),
  INDEX `idx_pl_created` (`created_at` DESC),
  CONSTRAINT `fk_pub_likes_pub` FOREIGN KEY (`publication_id`) REFERENCES `publications` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `publication_comments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NOT NULL,
  `publication_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pub_comment_uuid` (`uuid`),
  INDEX `idx_pub_comments_pub` (`publication_id`, `created_at` ASC),
  INDEX `idx_pub_comments_user` (`user_id`),
  CONSTRAINT `fk_pub_comments_pub` FOREIGN KEY (`publication_id`) REFERENCES `publications` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Segmentación de usuario para db_canvases (Mínimo Privilegio)
CREATE USER IF NOT EXISTS 'executor_canvases'@'%' IDENTIFIED BY 'secret_canvases_pass';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON db_canvases.* TO 'executor_canvases'@'%';
GRANT ALL PRIVILEGES ON db_canvases.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;

