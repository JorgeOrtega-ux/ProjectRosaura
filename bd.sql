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
  `user_status` enum('active','suspended','deleted') DEFAULT 'active',
  `profile_picture` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO server_config (id) 
SELECT 1 WHERE NOT EXISTS (SELECT * FROM server_config);

-- Si actualizas tu BD local, ejecuta:
-- DROP TABLE verification_codes;
-- DROP TABLE rate_limits;