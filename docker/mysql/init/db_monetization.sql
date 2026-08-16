CREATE DATABASE IF NOT EXISTS db_monetization;

USE db_monetization;

CREATE TABLE IF NOT EXISTS `ad_monetization_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `test_mode` tinyint(1) NOT NULL DEFAULT 0,
  `adblock_notice_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `default_provider` varchar(50) NOT NULL DEFAULT 'mock',
  `adsense_client_id` varchar(100) NOT NULL DEFAULT 'ca-pub-0000000000000000',
  `adsense_auto_ads` tinyint(1) NOT NULL DEFAULT 0,
  `custom_header_scripts` text DEFAULT NULL,
  `exempt_roles` varchar(255) NOT NULL DEFAULT '["3","4"]',
  `exempt_tiers` varchar(255) NOT NULL DEFAULT '["1","2","3"]',

  `feed_ads_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `feed_ad_interval` int(11) NOT NULL DEFAULT 8,
  `feed_ad_provider` varchar(50) NOT NULL DEFAULT 'mock',
  `feed_adsense_slot` varchar(100) NOT NULL DEFAULT '0000000000',
  `feed_adsense_layout_key` varchar(100) NOT NULL DEFAULT '-fb+5w+4e-db+86',
  `feed_mock_title` varchar(150) NOT NULL DEFAULT 'Patrocinado',
  `feed_mock_desc` varchar(255) NOT NULL DEFAULT 'Explora lienzos colaborativos y funciones exclusivas en Rosaura',
  `feed_mock_badge` varchar(50) NOT NULL DEFAULT 'Patrocinado',
  `feed_mock_cta_text` varchar(50) NOT NULL DEFAULT 'Descubrir más',
  `feed_mock_cta_url` varchar(255) NOT NULL DEFAULT '/upgrade',
  `feed_mock_image_url` varchar(255) NOT NULL DEFAULT '',
  `feed_custom_html` text DEFAULT NULL,

  `modal_ads_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `modal_ad_cooldown_seconds` int(11) NOT NULL DEFAULT 180,
  `modal_ad_duration_seconds` int(11) NOT NULL DEFAULT 5,
  `modal_ad_pod_size` int(11) NOT NULL DEFAULT 1,
  `modal_ad_muted_default` tinyint(1) NOT NULL DEFAULT 1,
  `modal_ad_provider` varchar(50) NOT NULL DEFAULT 'mock',
  `modal_adsense_slot` varchar(100) NOT NULL DEFAULT '0000000000',
  `modal_mock_sponsor_title` varchar(150) NOT NULL DEFAULT 'Rosaura Cloud',
  `modal_mock_sponsor_tagline` varchar(255) NOT NULL DEFAULT 'Infraestructura de renderizado colaborativo ultrarrápida',
  `modal_mock_sponsor_url` varchar(255) NOT NULL DEFAULT 'https://rosaura.io',
  `modal_mock_sponsor_avatar` varchar(100) NOT NULL DEFAULT 'cloud_done',
  `modal_custom_html` text DEFAULT NULL,

  `drawer_ads_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `drawer_ad_palette_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `drawer_ad_templates_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `drawer_ad_provider` varchar(50) NOT NULL DEFAULT 'mock',
  `drawer_adsense_slot` varchar(100) NOT NULL DEFAULT '0000000000',
  `drawer_mock_title` varchar(150) NOT NULL DEFAULT 'Paletas y Plantillas Pro',
  `drawer_mock_tagline` varchar(255) NOT NULL DEFAULT 'Desbloquea exportaciones ilimitadas y tokens',
  `drawer_mock_cta_url` varchar(255) NOT NULL DEFAULT '/upgrade',
  `drawer_mock_cta_text` varchar(50) NOT NULL DEFAULT 'Ver planes',
  `drawer_mock_badge` varchar(50) NOT NULL DEFAULT 'PRO',
  `drawer_custom_html` text DEFAULT NULL,

  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT IGNORE INTO `ad_monetization_settings` (
  `id`, `enabled`, `test_mode`, `adblock_notice_enabled`, `default_provider`, `adsense_client_id`, `adsense_auto_ads`, `exempt_roles`, `exempt_tiers`,
  `feed_ads_enabled`, `feed_ad_interval`, `feed_ad_provider`, `feed_adsense_slot`, `feed_adsense_layout_key`, `feed_mock_title`, `feed_mock_desc`, `feed_mock_badge`, `feed_mock_cta_text`, `feed_mock_cta_url`,
  `modal_ads_enabled`, `modal_ad_cooldown_seconds`, `modal_ad_duration_seconds`, `modal_ad_pod_size`, `modal_ad_muted_default`, `modal_ad_provider`, `modal_adsense_slot`, `modal_mock_sponsor_title`, `modal_mock_sponsor_tagline`, `modal_mock_sponsor_url`, `modal_mock_sponsor_avatar`,
  `drawer_ads_enabled`, `drawer_ad_palette_enabled`, `drawer_ad_templates_enabled`, `drawer_ad_provider`, `drawer_adsense_slot`, `drawer_mock_title`, `drawer_mock_tagline`, `drawer_mock_cta_url`, `drawer_mock_cta_text`, `drawer_mock_badge`
) VALUES (
  1, 1, 0, 0, 'mock', 'ca-pub-0000000000000000', 0, '["3","4"]', '["1","2","3"]',
  1, 8, 'mock', '0000000000', '-fb+5w+4e-db+86', 'Patrocinado', 'Explora lienzos colaborativos y funciones exclusivas en Rosaura', 'Patrocinado', 'Descubrir más', '/upgrade',
  1, 180, 5, 1, 1, 'mock', '0000000000', 'Rosaura Cloud', 'Infraestructura de renderizado colaborativo ultrarrápida', 'https://rosaura.io', 'cloud_done',
  1, 1, 1, 'mock', '0000000000', 'Paletas y Plantillas Pro', 'Desbloquea exportaciones ilimitadas y tokens', '/upgrade', 'Ver planes', 'PRO'
);

CREATE TABLE IF NOT EXISTS `ad_custom_campaigns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) UNIQUE NOT NULL,
  `name` varchar(150) NOT NULL,
  `placement` ENUM('feed', 'modal', 'panels', 'drawer_palette', 'drawer_templates') NOT NULL,
  `provider` ENUM('mock', 'adsense', 'custom') NOT NULL DEFAULT 'mock',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `priority` int(11) NOT NULL DEFAULT 1,
  `title` varchar(150) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `media_url` varchar(500) DEFAULT NULL,
  `target_url` varchar(500) DEFAULT NULL,
  `adsense_slot` varchar(100) DEFAULT NULL,
  `badge_text` varchar(50) DEFAULT NULL,
  `cta_text` varchar(50) DEFAULT NULL,
  `html_content` text DEFAULT NULL,
  `impressions_count` bigint(20) NOT NULL DEFAULT 0,
  `clicks_count` bigint(20) NOT NULL DEFAULT 0,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_placement_active` (`placement`, `is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `ad_impressions_daily` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ad_date` date NOT NULL,
  `placement` varchar(50) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `impressions` int(11) NOT NULL DEFAULT 0,
  `clicks` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_date_placement_provider` (`ad_date`, `placement`, `provider`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
