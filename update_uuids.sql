USE db_identity;
ALTER TABLE roles ADD COLUMN uuid CHAR(36) UNIQUE DEFAULT NULL;
UPDATE roles SET uuid = UUID() WHERE uuid IS NULL;

USE db_canvases;
ALTER TABLE canvas_roles ADD COLUMN uuid CHAR(36) UNIQUE DEFAULT NULL;
UPDATE canvas_roles SET uuid = UUID() WHERE uuid IS NULL;
