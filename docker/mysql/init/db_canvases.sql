CREATE DATABASE IF NOT EXISTS db_canvases;

USE db_canvases;

CREATE TABLE IF NOT EXISTS `canvases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `privacy` enum('public', 'private', 'unlisted') DEFAULT 'private',
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