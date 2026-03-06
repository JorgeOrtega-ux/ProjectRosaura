-- bd.sql
CREATE DATABASE IF NOT EXISTS projectrosaura;
USE projectrosaura;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `two_factor_secret` varchar(64) DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT 0,
  `two_factor_recovery_codes` text DEFAULT NULL,
  `role` enum('user','moderator','administrator','founder') DEFAULT 'user',
  `user_status` enum('active','deleted') DEFAULT 'active',
  `profile_picture` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS moderation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT(11) NOT NULL,
    admin_id INT(11) DEFAULT NULL,
    action_type ENUM('suspended', 'unsuspended', 'deleted', 'restored', 'note_updated') NOT NULL,
    reason TEXT DEFAULT NULL,
    end_date DATETIME DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mod_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mod_log_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS profile_changes_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT(11) NOT NULL,
    change_type ENUM('avatar', 'username', 'email', 'password', '2fa') NOT NULL,
    old_value VARCHAR(255) DEFAULT NULL,
    new_value VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    INDEX (change_type),
    INDEX (created_at),
    CONSTRAINT fk_user_profile_log FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT(11) NOT NULL,
    language VARCHAR(10) DEFAULT 'en-US',
    open_links_new_tab TINYINT(1) DEFAULT 1,
    theme ENUM('system', 'light', 'dark') DEFAULT 'system',
    extended_alerts TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id),
    CONSTRAINT fk_user_preferences FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT(11) NOT NULL,
    selector VARCHAR(255) NOT NULL,
    hashed_validator VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    CONSTRAINT fk_user_tokens FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX (selector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS server_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    min_password_length INT NOT NULL DEFAULT 8,
    max_password_length INT NOT NULL DEFAULT 64,
    min_username_length INT NOT NULL DEFAULT 3,
    max_username_length INT NOT NULL DEFAULT 32,
    max_avatar_size_mb INT NOT NULL DEFAULT 2,
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
    admin_edit_status_attempts INT NOT NULL DEFAULT 20,
    admin_edit_status_minutes INT NOT NULL DEFAULT 30,
    admin_add_note_attempts INT NOT NULL DEFAULT 30,
    admin_add_note_minutes INT NOT NULL DEFAULT 30,
    
    auto_backup_enabled TINYINT(1) NOT NULL DEFAULT 0,
    auto_backup_frequency_hours INT NOT NULL DEFAULT 24,
    auto_backup_retention_count INT NOT NULL DEFAULT 5,
    
    maintenance_mode TINYINT(1) NOT NULL DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO server_config (id) 
SELECT 1 WHERE NOT EXISTS (SELECT * FROM server_config);

-- === NUEVA TABLA PARA VIDEOS DEL STUDIO ===
CREATE TABLE IF NOT EXISTS videos (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_id INT(11) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    thumbnail_path VARCHAR(255) DEFAULT NULL,
    temp_file_path VARCHAR(255) DEFAULT NULL,
    hls_path VARCHAR(255) DEFAULT NULL,
    status ENUM('uploading', 'queued', 'processing', 'processed', 'failed', 'published') DEFAULT 'uploading',
    processing_progress INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_video_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- bd.sql (AÑADIR AL FINAL DEL ARCHIVO)

-- === NUEVA TABLA PARA TAGS (ACTORES Y CATEGORÍAS) ===
CREATE TABLE IF NOT EXISTS tags (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('actor', 'category') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;