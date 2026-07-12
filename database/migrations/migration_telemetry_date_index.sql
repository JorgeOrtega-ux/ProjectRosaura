USE db_telemetry;

ALTER TABLE pageviews
ADD COLUMN date_only DATE GENERATED ALWAYS AS (DATE(created_at)) STORED AFTER created_at,
ADD INDEX idx_date_only (date_only);

ALTER TABLE auth_events
ADD COLUMN date_only DATE GENERATED ALWAYS AS (DATE(created_at)) STORED AFTER created_at,
ADD INDEX idx_date_only (date_only);
