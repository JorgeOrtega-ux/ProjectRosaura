-- Migracion: Sistema de Papelera de Reciclaje de Lienzos
-- Fecha: 2026-08-21
-- Aplicar a db_canvases

USE db_canvases;

ALTER TABLE `canvases`
  ADD COLUMN `deleted_at` DATETIME DEFAULT NULL COMMENT 'NULL = activo, NOT NULL = en papelera',
  ADD COLUMN `deleted_by_user_id` INT(11) DEFAULT NULL COMMENT 'Usuario que lo envio a la papelera',
  ADD INDEX `idx_canvases_deleted` (`deleted_at`);
