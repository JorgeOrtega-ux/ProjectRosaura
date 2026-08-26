-- Migración: Sistema de Publicaciones, Comentarios, Identificadores y Banners de Usuario

-- 1. DB IDENTITY
USE db_identity;

-- Añadir columnas a users si no existen
SET @dbname = DATABASE();
SET @tablename = 'users';

-- Columna identifier
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = 'identifier')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN `identifier` VARCHAR(50) NULL UNIQUE AFTER `username`;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Columna identifier_updated_at
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = 'identifier_updated_at')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN `identifier_updated_at` DATETIME NULL AFTER `identifier`;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Columna banner_picture
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = 'banner_picture')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN `banner_picture` VARCHAR(255) NULL AFTER `profile_picture`;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Columna bio
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = 'bio')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN `bio` VARCHAR(255) NULL AFTER `banner_picture`;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Columna identifier_change_cooldown_days en server_config
SET @tablename = 'server_config';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = 'identifier_change_cooldown_days')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE server_config ADD COLUMN `identifier_change_cooldown_days` INT NOT NULL DEFAULT 90 AFTER `username_change_max_attempts`;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Columna max_banner_size_mb en server_config
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = 'max_banner_size_mb')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE server_config ADD COLUMN `max_banner_size_mb` INT NOT NULL DEFAULT 5 AFTER `max_avatar_size_mb`;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Rellenar identifier por defecto para usuarios existentes que tengan identifier NULL
UPDATE users SET identifier = LOWER(REPLACE(username, ' ', '_')) WHERE identifier IS NULL OR identifier = '';

-- 2. DB CANVASES
USE db_canvases;

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
  INDEX `idx_pub_canvas` (`canvas_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `publication_likes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `publication_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pub_user_like` (`publication_id`, `user_id`),
  INDEX `idx_pub_likes_user` (`user_id`),
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

-- Permisos de MySQL para usuarios ejecutores
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON db_identity.* TO 'system_web_executor'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON db_canvases.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;
