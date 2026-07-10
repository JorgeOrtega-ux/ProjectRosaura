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
