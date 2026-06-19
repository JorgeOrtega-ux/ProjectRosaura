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
-- ASIGNACIÓN DE PERMISOS AL USUARIO DE LA API
-- ==========================================
GRANT ALL PRIVILEGES ON db_canvases.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;