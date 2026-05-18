CREATE DATABASE IF NOT EXISTS db_telemetry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_telemetry;

-- Tabla para telemetría pasiva del backend (Middleware)
CREATE TABLE IF NOT EXISTS api_latency (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    latency_ms FLOAT NOT NULL,
    user_uuid CHAR(36) NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_endpoint (endpoint),
    INDEX idx_user (user_uuid)
) ENGINE=InnoDB;

-- Tabla para interacciones de navegación (Frontend)
CREATE TABLE IF NOT EXISTS pageviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    path VARCHAR(255) NOT NULL,
    load_time_ms FLOAT NOT NULL,
    user_uuid CHAR(36) NULL,
    session_id VARCHAR(128) NULL,
    device_type VARCHAR(50) NULL,
    theme_preference VARCHAR(10) NULL,
    locale VARCHAR(10) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_path (path)
) ENGINE=InnoDB;

-- Tabla para eventos específicos de negocio y lienzo (Frontend/Backend)
CREATE TABLE IF NOT EXISTS canvas_interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    canvas_uuid CHAR(36) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- ej. 'pixel_placed', 'tool_changed', 'canvas_loaded'
    user_uuid CHAR(36) NULL,
    metadata JSON NULL, -- Para guardar datos extra sin romper el esquema
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_canvas_created (canvas_uuid, created_at),
    INDEX idx_action (action_type)
) ENGINE=InnoDB;

-- Tabla para telemetría de seguridad (Backend)
CREATE TABLE IF NOT EXISTS auth_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- ej. 'login_success', 'captcha_failed', '2fa_verified'
    user_uuid CHAR(36) NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_event (event_type)
) ENGINE=InnoDB;

-- ==========================================
-- PERMISOS PARA EL USUARIO DE LA APLICACIÓN
-- ==========================================
-- Esto garantiza que el usuario definido en .env (system_web_executor)
-- tenga control total sobre la base de datos de telemetría.
GRANT ALL PRIVILEGES ON db_telemetry.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;