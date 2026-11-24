-- Repair drift on mdl_location_aisles: the live table predates migration
-- 040's stats columns, and migrations run once per file so the updated 040
-- never re-applied. Aisle prediction hits "column la.confidence_score does
-- not exist" on every lookup.
ALTER TABLE mdl_location_aisles ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.50;
ALTER TABLE mdl_location_aisles ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;
