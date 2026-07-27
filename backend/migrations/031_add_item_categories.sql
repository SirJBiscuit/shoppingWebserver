-- Migration: Add item categories to inventory for Home Inventory expansion
-- This allows tracking kitchen, bathroom, pet supplies, cleaning, etc.

-- Add item_category column to inventory table
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS item_category VARCHAR(50) DEFAULT 'food';

-- Add index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_inventory_category 
ON inventory(user_id, item_category);

-- Add index for category + location filtering
CREATE INDEX IF NOT EXISTS idx_inventory_category_location 
ON inventory(user_id, item_category, custom_location_id);

-- Update existing items to have 'food' category
UPDATE inventory 
SET item_category = 'food' 
WHERE item_category IS NULL;

-- Add comment explaining categories
COMMENT ON COLUMN inventory.item_category IS 'Category of item: food, household, pet, medical, cleaning, tools, beauty, other';

-- Create enum-like constraint (optional, can be removed if too restrictive)
-- ALTER TABLE inventory 
-- ADD CONSTRAINT check_item_category 
-- CHECK (item_category IN ('food', 'household', 'pet', 'medical', 'cleaning', 'tools', 'beauty', 'other'));

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 031: Item categories added successfully!';
  RAISE NOTICE 'Categories supported: food, household, pet, medical, cleaning, tools, beauty, other';
END $$;
