CREATE DATABASE IF NOT EXISTS db_locations;

USE db_locations;

CREATE TABLE IF NOT EXISTS `countries` (
  `id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `iso2` char(2) NOT NULL,
  `iso3` char(3) NOT NULL,
  `phone_code` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `iso2` (`iso2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `states` (
  `id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `country_id` mediumint(8) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `state_code` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_states_country` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `cities` (
  `id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `state_id` mediumint(8) unsigned NOT NULL,
  `country_id` mediumint(8) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cities_state` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cities_country` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==========================================
-- DATOS DE MUESTRA BÁSICOS (EJEMPLO ESTRUCTURAL)
-- Nota: En producción importarías un volcado SQL masivo.
-- Estos datos sirven para que tu contenedor inicie con información y puedas hacer pruebas.
-- ==========================================

INSERT IGNORE INTO `countries` (`id`, `name`, `iso2`, `iso3`, `phone_code`) VALUES 
(142, 'Mexico', 'MX', 'MEX', '52');

INSERT IGNORE INTO `states` (`id`, `country_id`, `name`, `state_code`) VALUES 
(2409, 142, 'Tamaulipas', 'TAM');

INSERT IGNORE INTO `cities` (`id`, `state_id`, `country_id`, `name`) VALUES 
(68512, 2409, 142, 'Matamoros');

-- ==========================================
-- ASIGNACIÓN DE PERMISOS AL USUARIO DE LA API
-- ==========================================
GRANT ALL PRIVILEGES ON db_locations.* TO 'system_web_executor'@'%';
FLUSH PRIVILEGES;