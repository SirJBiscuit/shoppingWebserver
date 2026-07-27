-- Migration: Rename Pantry feature to Home Inventory
-- Updates feature flag name and description

-- Update the feature flag
UPDATE feature_flags 
SET 
  feature_name = 'home_inventory',
  description = 'Track and manage all household items - kitchen, bathroom, pet supplies, cleaning products, and more'
WHERE feature_name = 'pantry';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 033: Feature renamed from "pantry" to "home_inventory"';
  RAISE NOTICE 'Description updated to reflect expanded functionality';
END $$;
