-- Add new feature flags for better admin control
-- Migration: 029_add_feature_flags.sql

-- Insert new feature flags if they don't exist
INSERT INTO features (key, name, description, category, min_tier, is_enabled, created_at)
VALUES 
  ('ach_customization', 'ACH Customization', 'Access to ACH customization interface in sidebar', 'admin', 'premium', true, CURRENT_TIMESTAMP),
  ('dashboard_editor', 'Dashboard Editor', 'Ability to customize dashboard layout and widgets', 'customization', 'premium', true, CURRENT_TIMESTAMP),
  ('store_management', 'Store Management', 'Manage custom stores and aisle configurations', 'shopping', 'free', true, CURRENT_TIMESTAMP),
  ('recipe_discovery', 'Recipe Discovery', 'Discover and import recipes from external sites', 'recipes', 'free', true, CURRENT_TIMESTAMP),
  ('activity_history', 'Activity History', 'View shopping and cooking activity history', 'analytics', 'free', true, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  min_tier = EXCLUDED.min_tier;

-- Make sure existing features are properly configured
UPDATE features SET is_enabled = true WHERE key IN (
  'shopping_lists',
  'pantry',
  'recipes',
  'meal_planner',
  'statistics',
  'voice_input',
  'barcode_scanner',
  'sharing'
);

-- Add comments
COMMENT ON COLUMN features.is_enabled IS 'Global enable/disable toggle for the feature';
COMMENT ON COLUMN features.min_tier IS 'Minimum subscription tier required: free, basic, premium, enterprise';
