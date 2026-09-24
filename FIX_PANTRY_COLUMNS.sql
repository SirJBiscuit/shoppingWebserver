-- Fix pantry_inventory table to match backend expectations
-- Run these commands in your SSH terminal

-- 1. Add missing columns to pantry_inventory
ALTER TABLE pantry_inventory 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS storage_location VARCHAR(50) DEFAULT 'pantry',
ADD COLUMN IF NOT EXISTS profile_id INTEGER;

-- 2. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pantry_user_item 
ON pantry_inventory(user_id, item_name);

CREATE INDEX IF NOT EXISTS idx_pantry_expiry 
ON pantry_inventory(expiry_date) WHERE expiry_date IS NOT NULL;

-- 3. Add unique constraint for conflict resolution
-- First, remove any duplicates if they exist
DELETE FROM pantry_inventory a USING pantry_inventory b
WHERE a.id < b.id 
AND a.user_id = b.user_id 
AND a.item_name = b.item_name
AND COALESCE(a.profile_id, 0) = COALESCE(b.profile_id, 0);

-- Then add the unique constraint
ALTER TABLE pantry_inventory
DROP CONSTRAINT IF EXISTS pantry_inventory_user_item_unique;

ALTER TABLE pantry_inventory
ADD CONSTRAINT pantry_inventory_user_item_unique 
UNIQUE (user_id, COALESCE(profile_id, 0), item_name);

-- 4. Fix shopping_list_recipes missing column
ALTER TABLE shopping_list_recipes 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- 5. Verify changes
SELECT 'Pantry columns added successfully' AS status;
