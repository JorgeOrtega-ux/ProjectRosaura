-- Migration: Extract features JSON data into individual columns on subscription_tiers
-- Run this manually on existing databases that already have data in the features JSON column.

USE db_identity;

-- 1. Add the new columns
ALTER TABLE subscription_tiers
  ADD COLUMN `price_monthly` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `stripe_price_id_yearly`,
  ADD COLUMN `price_yearly` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `price_monthly`,
  ADD COLUMN `max_canvases` INT NOT NULL DEFAULT 1 AFTER `price_yearly`,
  ADD COLUMN `max_storage_mb` INT NOT NULL DEFAULT 20 AFTER `max_canvases`,
  ADD COLUMN `max_snapshots_per_canvas` INT NOT NULL DEFAULT 10 AFTER `max_storage_mb`,
  ADD COLUMN `max_members_per_canvas` INT NOT NULL DEFAULT 10 AFTER `max_snapshots_per_canvas`,
  ADD COLUMN `max_custom_palettes` INT NOT NULL DEFAULT 0 AFTER `max_members_per_canvas`,
  ADD COLUMN `feat_advanced_roles` TINYINT(1) NOT NULL DEFAULT 0 AFTER `max_custom_palettes`,
  ADD COLUMN `feat_chat_restriction` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feat_advanced_roles`,
  ADD COLUMN `feat_custom_palettes` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feat_chat_restriction`,
  ADD COLUMN `feat_priority_rendering` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feat_custom_palettes`,
  ADD COLUMN `feat_unlimited_exports` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feat_priority_rendering`,
  ADD COLUMN `feat_beta_access` TINYINT(1) NOT NULL DEFAULT 0 AFTER `feat_unlimited_exports`;

-- 2. Migrate data from features JSON to individual columns
UPDATE subscription_tiers SET
  price_monthly = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(features, '$.price_monthly')), 0),
  price_yearly = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(features, '$.price_yearly')), 0),
  max_canvases = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(features, '$.limits.max_canvases')), 1),
  max_storage_mb = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(features, '$.limits.max_storage_mb')), 20),
  max_snapshots_per_canvas = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(features, '$.limits.max_snapshots_per_canvas')), 10),
  max_members_per_canvas = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(features, '$.limits.max_members_per_canvas')), 10),
  max_custom_palettes = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(features, '$.limits.max_custom_palettes')), 0),
  feat_advanced_roles = COALESCE(JSON_EXTRACT(features, '$.feat_advanced_roles') = true, 0),
  feat_chat_restriction = COALESCE(JSON_EXTRACT(features, '$.feat_chat_restriction') = true, 0),
  feat_custom_palettes = COALESCE(JSON_EXTRACT(features, '$.feat_custom_palettes') = true, 0),
  feat_priority_rendering = COALESCE(JSON_EXTRACT(features, '$.feat_priority_rendering') = true, 0),
  feat_unlimited_exports = COALESCE(JSON_EXTRACT(features, '$.feat_unlimited_exports') = true, 0),
  feat_beta_access = COALESCE(JSON_EXTRACT(features, '$.feat_beta_access') = true, 0)
WHERE features IS NOT NULL;

-- 3. Fix the 'Basica' name to 'Basic'
UPDATE subscription_tiers SET name = 'Basic' WHERE name = 'Basica';

-- 4. Fix tier colors: Basic=gray, Plus=green, Pro=orange, Ultra=multicolor(red/blue/green/yellow)
UPDATE subscription_tiers SET color = '{"type":"solid","colors":[{"hex":"#808080","percentage":100}]}' WHERE tier_level = 0;
UPDATE subscription_tiers SET color = '{"type":"solid","colors":[{"hex":"#28a745","percentage":100}]}' WHERE tier_level = 1;
UPDATE subscription_tiers SET color = '{"type":"solid","colors":[{"hex":"#fd7e14","percentage":100}]}' WHERE tier_level = 2;
UPDATE subscription_tiers SET color = '{"type":"gradient","angle":0,"colors":[{"hex":"#ff0000","percentage":25},{"hex":"#0000ff","percentage":25},{"hex":"#00ff00","percentage":25},{"hex":"#ffff00","percentage":25}]}' WHERE tier_level = 3;

-- 5. Drop the features column
ALTER TABLE subscription_tiers DROP COLUMN `features`;
