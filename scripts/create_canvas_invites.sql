CREATE TABLE IF NOT EXISTS `canvas_invites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `canvas_id` INT NOT NULL,
  `code` VARCHAR(10) NOT NULL UNIQUE,
  `role` VARCHAR(50) NOT NULL,
  `max_uses` INT NULL,
  `uses_count` INT DEFAULT 0,
  `expires_at` DATETIME NULL,
  `created_by` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`canvas_id`) REFERENCES `canvases`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
