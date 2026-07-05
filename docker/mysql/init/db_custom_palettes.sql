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
