-- Migracion: Sistema de Papelera de Reciclaje de Plantillas
-- Fecha: 2026-08-21
-- Aplicar a db_canvases

USE db_canvases;

ALTER TABLE user_templates
  ADD COLUMN deleted_at DATETIME DEFAULT NULL COMMENT 'NULL = activo, NOT NULL = en papelera',
  ADD INDEX idx_user_templates_deleted (deleted_at);
