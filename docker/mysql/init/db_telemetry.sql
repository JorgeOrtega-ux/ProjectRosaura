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
    asn VARCHAR(255) NULL,
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

-- Tabla para eventos específicos de interacción en la interfaz (Frontend)
CREATE TABLE IF NOT EXISTS page_interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    path VARCHAR(255) NULL,
    user_uuid CHAR(36) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_action (action_type)
) ENGINE=InnoDB;

-- Tabla para telemetría de seguridad (Backend)
CREATE TABLE IF NOT EXISTS auth_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_uuid CHAR(36) NULL,
    ip_address VARCHAR(45) NULL,
    asn VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_event (event_type)
) ENGINE=InnoDB;

-- ==========================================
-- PERMISOS PARA EL USUARIO DE LA APLICACIÓN
-- ==========================================
GRANT ALL PRIVILEGES ON db_telemetry.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;