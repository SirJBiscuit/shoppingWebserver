-- Migration: Add location categories for Home Inventory organization
-- Allows grouping storage locations by room/area type

-- Add location_category to custom_storage_locations
ALTER TABLE custom_storage_locations 
ADD COLUMN IF NOT EXISTS location_category VARCHAR(50) DEFAULT 'kitchen';

-- Add icon field for better UI
ALTER TABLE custom_storage_locations 
ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_storage_location_category 
ON custom_storage_locations(user_id, location_category);

-- Update existing locations to have 'kitchen' category
UPDATE custom_storage_locations 
SET location_category = 'kitchen' 
WHERE location_category IS NULL;

-- Set default icons for common locations
UPDATE custom_storage_locations 
SET icon = CASE 
  WHEN LOWER(name) LIKE '%pantry%' THEN '🥫'
  WHEN LOWER(name) LIKE '%fridge%' OR LOWER(name) LIKE '%refrigerator%' THEN '❄️'
  WHEN LOWER(name) LIKE '%freezer%' THEN '🧊'
  WHEN LOWER(name) LIKE '%cabinet%' THEN '🚪'
  WHEN LOWER(name) LIKE '%bathroom%' THEN '🛁'
  WHEN LOWER(name) LIKE '%medicine%' THEN '💊'
  WHEN LOWER(name) LIKE '%garage%' THEN '🚗'
  WHEN LOWER(name) LIKE '%pet%' THEN '🐾'
  WHEN LOWER(name) LIKE '%laundry%' THEN '🧺'
  ELSE '📦'
END
WHERE icon IS NULL;

-- Add comment explaining categories
COMMENT ON COLUMN custom_storage_locations.location_category IS 'Category of location: kitchen, bathroom, pet, cleaning, garage, bedroom, other';
COMMENT ON COLUMN custom_storage_locations.icon IS 'Emoji or icon identifier for the location';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 032: Location categories and icons added successfully!';
  RAISE NOTICE 'Categories supported: kitchen, bathroom, pet, cleaning, garage, bedroom, other';
END $$;
