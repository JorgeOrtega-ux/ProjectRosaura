CREATE DATABASE IF NOT EXISTS db_advertisements CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_advertisements;

CREATE TABLE IF NOT EXISTS ad_providers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    provider_type ENUM('network', 'direct') NOT NULL DEFAULT 'direct',
    network_id VARCHAR(191) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    has_expiration TINYINT(1) NOT NULL DEFAULT 0,
    start_date DATETIME NULL,
    expiration_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_active (is_active),
    INDEX idx_provider_type (provider_type),
    INDEX idx_provider_exp (has_expiration, expiration_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS advertisements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    provider_id BIGINT NOT NULL,
    name VARCHAR(191) NOT NULL,
    title VARCHAR(255) NULL,
    description TEXT NULL,
    target_url VARCHAR(1024) NULL,
    sponsor_label VARCHAR(100) NULL,
    format ENUM('feed', 'module_colors', 'module_templates') NOT NULL DEFAULT 'feed',
    status ENUM('active', 'inactive', 'paused', 'expired') NOT NULL DEFAULT 'active',
    has_expiration TINYINT(1) NOT NULL DEFAULT 0,
    start_date DATETIME NULL,
    expiration_date DATETIME NULL,
    settings JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ad_provider (provider_id),
    INDEX idx_ad_status (status),
    INDEX idx_ad_format (format),
    INDEX idx_ad_exp (has_expiration, expiration_date),
    CONSTRAINT fk_ad_provider FOREIGN KEY (provider_id) REFERENCES ad_providers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ad_resources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    ad_id BIGINT NOT NULL,
    resource_type ENUM('image', 'video', 'text', 'script', 'vast', 'html') NOT NULL DEFAULT 'image',
    content_url VARCHAR(1024) NULL,
    raw_content MEDIUMTEXT NULL,
    alt_text VARCHAR(255) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource_ad (ad_id),
    INDEX idx_resource_order (ad_id, sort_order),
    CONSTRAINT fk_resource_ad FOREIGN KEY (ad_id) REFERENCES advertisements(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ad_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ad_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    event_type ENUM('impression', 'click', 'video_view', 'conversion') NOT NULL DEFAULT 'impression',
    user_uuid CHAR(36) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_only DATE GENERATED ALWAYS AS (DATE(created_at)) STORED,
    INDEX idx_metrics_ad (ad_id),
    INDEX idx_metrics_provider (provider_id),
    INDEX idx_metrics_date (date_only),
    INDEX idx_metrics_event (event_type, created_at),
    CONSTRAINT fk_metrics_ad FOREIGN KEY (ad_id) REFERENCES advertisements(id) ON DELETE CASCADE,
    CONSTRAINT fk_metrics_provider FOREIGN KEY (provider_id) REFERENCES ad_providers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Default Seed Data
INSERT INTO ad_providers (id, uuid, name, provider_type, network_id, is_active, has_expiration) VALUES
(1, 'a1000000-0000-0000-0000-000000000001', 'Google AdSense', 'network', 'ca-pub-9842109482109842', 1, 0),
(2, 'a1000000-0000-0000-0000-000000000002', 'PixelCraft Pro', 'direct', NULL, 1, 0),
(3, 'a1000000-0000-0000-0000-000000000003', 'ChromaPad Studio', 'direct', NULL, 1, 0),
(4, 'a1000000-0000-0000-0000-000000000004', 'Palette Master AI', 'direct', NULL, 1, 0),
(5, 'a1000000-0000-0000-0000-000000000005', 'NeoRetro Assets', 'direct', NULL, 1, 0)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO advertisements (id, uuid, provider_id, name, title, description, target_url, sponsor_label, format, status, has_expiration) VALUES
(1, 'b1000000-0000-0000-0000-000000000001', 2, 'Herramientas Creativas 2D', 'Herramientas Creativas 2D', 'Pinceles inteligentes, capas avanzadas y exportación de spritesheets en tiempo real.', '/upgrade', 'PixelCraft Pro', 'feed', 'active', 0),
(2, 'b1000000-0000-0000-0000-000000000002', 3, 'Tabletas Digitales Profesionales', 'Tabletas Digitales Profesionales', 'Sensibilidad de presión de 8192 niveles con control RGB para artistas de pixel.', '/upgrade', 'ChromaPad X', 'feed', 'active', 0),
(3, 'b1000000-0000-0000-0000-000000000003', 4, 'Generador de Paletas Armónicas', 'Generador de Paletas Armónicas', 'Extracción instantánea de degradados y paletas cromáticas para tu lienzo.', '/upgrade', 'Palette Master AI', 'feed', 'active', 0),
(4, 'b1000000-0000-0000-0000-000000000004', 5, 'Librería de Plantillas 16-Bit', 'Librería de Plantillas 16-Bit', 'Más de 5,000 mapas isométricos, tilesets y planos listos para colocar.', '/upgrade', 'NeoRetro Assets', 'feed', 'active', 0),
(5, 'b1000000-0000-0000-0000-000000000005', 3, 'Paletas y Armonías Exclusivas', 'Paletas y Armonías Exclusivas', 'Descubre combinaciones de colores únicas y degradados profesionales para tus obras.', '/upgrade', 'Chroma Studio', 'module_colors', 'active', 0),
(6, 'b1000000-0000-0000-0000-000000000006', 5, 'Pack de Plantillas Pixel Art', 'Pack de Plantillas Pixel Art', 'Inyecta estructuras, mapas y esquemas de referencia directamente en tu lienzo.', '/upgrade', 'RetroCraft Blueprints', 'module_templates', 'active', 0)
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO ad_resources (id, uuid, ad_id, resource_type, content_url, alt_text, sort_order) VALUES
(1, 'c1000000-0000-0000-0000-000000000001', 1, 'image', '/assets/img/showcase/creative_tools.jpg', 'PixelCraft Tools', 0),
(2, 'c1000000-0000-0000-0000-000000000002', 1, 'image', '/assets/img/showcase/drawing_pad.jpg', 'ChromaPad Studio', 1),
(3, 'c1000000-0000-0000-0000-000000000003', 1, 'video', '/assets/media/sample_promo.mp4', 'PixelCraft Demo', 2),
(4, 'c1000000-0000-0000-0000-000000000004', 2, 'image', '/assets/img/showcase/drawing_pad.jpg', 'ChromaPad X', 0),
(5, 'c1000000-0000-0000-0000-000000000005', 2, 'image', '/assets/img/showcase/palette_master.jpg', 'Color Match', 1),
(6, 'c1000000-0000-0000-0000-000000000006', 3, 'image', '/assets/img/showcase/palette_master.jpg', 'Palette Master', 0),
(7, 'c1000000-0000-0000-0000-000000000007', 3, 'image', '/assets/img/showcase/templates_pro.jpg', 'Templates Pro', 1),
(8, 'c1000000-0000-0000-0000-000000000008', 3, 'video', '/assets/media/sample_promo.mp4', 'Palette Demo', 2),
(9, 'c1000000-0000-0000-0000-000000000009', 4, 'image', '/assets/img/showcase/templates_pro.jpg', 'NeoRetro Assets', 0),
(10, 'c1000000-0000-0000-0000-000000000010', 4, 'image', '/assets/img/showcase/creative_tools.jpg', 'Creative Studio', 1),
(11, 'c1000000-0000-0000-0000-000000000011', 5, 'image', '/assets/img/showcase/palette_master.jpg', 'Chroma Studio', 0),
(12, 'c1000000-0000-0000-0000-000000000012', 5, 'image', '/assets/img/showcase/creative_tools.jpg', 'Tools UI', 1),
(13, 'c1000000-0000-0000-0000-000000000013', 5, 'video', '/assets/media/sample_promo.mp4', 'Color Demo', 2),
(14, 'c1000000-0000-0000-0000-000000000014', 6, 'image', '/assets/img/showcase/templates_pro.jpg', 'RetroCraft Blueprints', 0),
(15, 'c1000000-0000-0000-0000-000000000015', 6, 'image', '/assets/img/showcase/drawing_pad.jpg', 'Drawing Tablet', 1),
(16, 'c1000000-0000-0000-0000-000000000016', 6, 'video', '/assets/media/sample_promo.mp4', 'Templates Demo', 2)
ON DUPLICATE KEY UPDATE alt_text=VALUES(alt_text);

-- Segmentación de usuario para db_advertisements (Mínimo Privilegio)
CREATE USER IF NOT EXISTS 'executor_ads'@'%' IDENTIFIED BY 'secret_ads_pass';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON db_advertisements.* TO 'executor_ads'@'%';
GRANT ALL PRIVILEGES ON db_advertisements.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;
