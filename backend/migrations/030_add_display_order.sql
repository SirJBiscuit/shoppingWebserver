-- Add display_order column for custom feature ordering
-- Migration: 030_add_display_order.sql

-- Add display_order column if it doesn't exist
ALTER TABLE feature_flags 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Set initial display order based on current order
UPDATE feature_flags SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY category, feature_name) - 1 as row_num
  FROM feature_flags
) AS subquery
WHERE feature_flags.id = subquery.id;

-- Add index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_feature_flags_display_order 
ON feature_flags(display_order);

-- Add comment
COMMENT ON COLUMN feature_flags.display_order IS 'Custom display order for features in sidebar (0-indexed)';
