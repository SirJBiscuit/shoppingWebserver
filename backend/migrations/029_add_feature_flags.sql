-- Add new feature flags for better admin control
-- Migration: 029_add_feature_flags.sql

-- Insert new feature flags if they don't exist
INSERT INTO feature_flags (feature_key, feature_name, description, category, min_tier, is_enabled, free_tier_enabled, premium_tier_enabled, created_at)
VALUES 
  ('ach_customization', 'ACH Customization', 'Access to ACH customization interface in sidebar', 'admin', 'premium', true, false, true, CURRENT_TIMESTAMP),
  ('dashboard_editor', 'Dashboard Editor', 'Ability to customize dashboard layout and widgets', 'customization', 'premium', true, false, true, CURRENT_TIMESTAMP),
  ('store_management', 'Store Management', 'Manage custom stores and aisle configurations', 'shopping', 'free', true, true, true, CURRENT_TIMESTAMP),
  ('recipe_discovery', 'Recipe Discovery', 'Discover and import recipes from external sites', 'recipes', 'free', true, true, true, CURRENT_TIMESTAMP),
  ('activity_history', 'Activity History', 'View shopping and cooking activity history', 'analytics', 'free', true, true, true, CURRENT_TIMESTAMP)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  min_tier = EXCLUDED.min_tier,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled;

-- Make sure existing features are properly configured
UPDATE feature_flags SET is_enabled = true, free_tier_enabled = true, premium_tier_enabled = true 
WHERE feature_key IN (
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
COMMENT ON COLUMN feature_flags.is_enabled IS 'Global enable/disable toggle for the feature';
COMMENT ON COLUMN feature_flags.min_tier IS 'Minimum subscription tier required: free, basic, premium, enterprise';
COMMENT ON COLUMN feature_flags.free_tier_enabled IS 'Whether free tier users can access this feature';
COMMENT ON COLUMN feature_flags.premium_tier_enabled IS 'Whether premium tier users can access this feature';
