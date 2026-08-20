-- ============================================================
-- MIGRACIÓN: Papelera de Reciclaje (Soft Delete)
-- Ejecutar en: db_canvases
-- Fecha: 2026-08-20
-- ============================================================

USE db_canvases;

-- 1. Soporte de Soft Delete en Lienzos
ALTER TABLE `canvases` 
ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL AFTER `updated_at`,
ADD INDEX `idx_canvases_deleted` (`owner_id`, `deleted_at`);

-- 2. Soporte de Soft Delete en Plantillas de Usuario
ALTER TABLE `user_templates` 
ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL AFTER `created_at`,
ADD INDEX `idx_user_templates_deleted` (`user_id`, `deleted_at`);

-- ============================================================
-- IMPORTANTE: Tras esta migración, revisar las consultas 
-- existentes en canvases y user_templates para asegurarse 
-- de que filtren por: WHERE deleted_at IS NULL
-- ============================================================
