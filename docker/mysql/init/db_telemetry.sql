CREATE DATABASE IF NOT EXISTS db_telemetry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_telemetry;

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
    date_only DATE GENERATED ALWAYS AS (DATE(created_at)) STORED,
    INDEX idx_created_at (created_at),
    INDEX idx_date_only (date_only),
    INDEX idx_path (path)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_uuid CHAR(36) NULL,
    ip_address VARCHAR(45) NULL,
    asn VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_only DATE GENERATED ALWAYS AS (DATE(created_at)) STORED,
    INDEX idx_created_at (created_at),
    INDEX idx_date_only (date_only),
    INDEX idx_event (event_type)
) ENGINE=InnoDB;

GRANT ALL PRIVILEGES ON db_telemetry.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;
