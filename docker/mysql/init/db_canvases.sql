CREATE DATABASE IF NOT EXISTS db_canvases;

USE db_canvases;

CREATE TABLE IF NOT EXISTS `canvases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `privacy` enum('public', 'private') DEFAULT 'private',
  `requires_approval` tinyint(1) NOT NULL DEFAULT 0,
  `size` varchar(20) NOT NULL DEFAULT '64',
  `palette_id` varchar(50) NOT NULL DEFAULT 'default',
  `max_participants` int(11) NOT NULL DEFAULT 10,
  `cooldown_pixels_batch` int(11) NOT NULL DEFAULT 5,
  `cooldown_seconds` int(11) NOT NULL DEFAULT 10,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  INDEX `idx_user_canvases` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `canvas_members` (
  `canvas_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('viewer', 'editor', 'admin') DEFAULT 'viewer',
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`canvas_id`, `user_id`),
  CONSTRAINT `fk_cm_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

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
-- TABLA NUEVA PARA CONFIGURACIÓN DE REINICIOS
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
-- TABLA NUEVA PARA HISTORIAL DE REINICIOS (SNAPSHOTS)
-- ==========================================

CREATE TABLE IF NOT EXISTS `canvas_snapshots_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `canvas_id` int(11) NOT NULL,
  `snapshot_uuid` varchar(36) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_snapshot_uuid` (`snapshot_uuid`),
  CONSTRAINT `fk_history_canvas` FOREIGN KEY (`canvas_id`) REFERENCES `canvases` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- ==========================================
-- TABLA NUEVA PARA LIBRERÍA DE PLANTILLAS DE USUARIO
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
-- ASIGNACIÓN DE PERMISOS AL USUARIO DE LA API
-- ==========================================
GRANT ALL PRIVILEGES ON db_canvases.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;