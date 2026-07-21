-- Add guest tier to tier_limits and expand feature flags for granular control

-- Add guest tier limits
INSERT INTO tier_limits (tier_name, limit_key, limit_value, description) VALUES
  ('guest', 'max_shopping_lists', 1, 'Maximum number of shopping lists for guest users'),
  ('guest', 'max_items_per_list', 20, 'Maximum items per shopping list for guest users'),
  ('guest', 'max_pantry_items', 0, 'Maximum pantry items (0 = disabled)'),
  ('guest', 'max_recipes', 0, 'Maximum recipes (0 = disabled)'),
  ('guest', 'max_meal_plans', 0, 'Maximum meal plans (0 = disabled)'),
  ('free', 'max_shopping_lists', 5, 'Maximum number of shopping lists for free users'),
  ('free', 'max_items_per_list', 50, 'Maximum items per shopping list for free users'),
  ('free', 'max_pantry_items', 50, 'Maximum pantry items for free users'),
  ('free', 'max_recipes', 10, 'Maximum recipes for free users'),
  ('free', 'max_meal_plans', 2, 'Maximum meal plans for free users'),
  ('premium', 'max_shopping_lists', -1, 'Unlimited shopping lists'),
  ('premium', 'max_items_per_list', -1, 'Unlimited items per list'),
  ('premium', 'max_pantry_items', -1, 'Unlimited pantry items'),
  ('premium', 'max_recipes', -1, 'Unlimited recipes'),
  ('premium', 'max_meal_plans', -1, 'Unlimited meal plans')
ON CONFLICT (tier_name, limit_key) DO UPDATE 
  SET limit_value = EXCLUDED.limit_value,
      description = EXCLUDED.description;

-- Add detailed feature flags for each tier
INSERT INTO feature_flags (feature_key, feature_name, description, category, is_enabled, min_tier) VALUES
  -- Core Features
  ('shopping_lists', 'Shopping Lists', 'Basic shopping list functionality', 'core', true, 'guest'),
  ('animations', 'Animations', 'UI animations and transitions', 'ui', true, 'free'),
  
  -- Kitchen Features
  ('pantry', 'Kitchen Inventory', 'Pantry/fridge/freezer tracking', 'kitchen', true, 'free'),
  ('recipes', 'Recipe Box', 'Recipe management', 'kitchen', true, 'free'),
  ('meal_planner', 'Meal Planner', 'Weekly meal planning', 'kitchen', true, 'free'),
  ('recipe_discovery', 'Recipe Discovery', 'Discover new recipes', 'kitchen', true, 'free'),
  
  -- Smart Features
  ('voice_input', 'Voice Input', 'Add items by voice', 'smart', true, 'free'),
  ('barcode_scanner', 'Barcode Scanner', 'Scan product barcodes', 'smart', true, 'free'),
  ('smart_suggestions', 'Smart Suggestions', 'AI-powered item suggestions', 'smart', true, 'free'),
  
  -- Social Features
  ('share_lists', 'Share Lists', 'Share shopping lists with others', 'social', true, 'free'),
  ('activity_history', 'Activity History', 'View shopping history', 'social', true, 'free'),
  
  -- Analytics
  ('statistics', 'Statistics', 'Shopping analytics and insights', 'analytics', true, 'free'),
  ('budget_tracker', 'Budget Tracker', 'Track spending', 'analytics', true, 'free'),
  
  -- Advanced Features
  ('store_manager', 'Store Manager', 'Manage custom stores and aisles', 'advanced', true, 'free'),
  ('custom_themes', 'Custom Themes', 'Customize app appearance', 'advanced', true, 'premium'),
  ('priority_support', 'Priority Support', 'Faster customer support', 'advanced', true, 'premium'),
  ('export_data', 'Export Data', 'Export lists and data', 'advanced', true, 'premium'),
  
  -- Dashboard Widgets
  ('widget_pantry_quick_view', 'Pantry Quick View Widget', 'Show pantry items in dashboard', 'widgets', true, 'free'),
  ('widget_next_item', 'Next Item Suggestion Widget', 'Smart next item suggestions', 'widgets', true, 'free'),
  ('widget_budget', 'Budget Widget', 'Budget tracker widget', 'widgets', true, 'free'),
  ('widget_stats', 'Statistics Widget', 'Quick stats overview', 'widgets', true, 'free'),
  ('widget_meal_plan', 'Meal Plan Widget', 'Upcoming meals widget', 'widgets', true, 'free')
ON CONFLICT (feature_key) DO UPDATE 
  SET feature_name = EXCLUDED.feature_name,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      is_enabled = EXCLUDED.is_enabled,
      min_tier = EXCLUDED.min_tier;

-- Create dashboard_widgets table for positioning and customization
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id SERIAL PRIMARY KEY,
  widget_key VARCHAR(100) NOT NULL UNIQUE,
  widget_name VARCHAR(255) NOT NULL,
  description TEXT,
  default_position INTEGER NOT NULL DEFAULT 0,
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  min_tier VARCHAR(50) NOT NULL DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default dashboard widgets
INSERT INTO dashboard_widgets (widget_key, widget_name, description, default_position, default_enabled, min_tier) VALUES
  ('pantry_quick_view', 'Pantry Quick View', 'Shows pantry items with low stock alerts', 1, true, 'free'),
  ('next_item_suggestion', 'Next Item Suggestion', 'AI-powered next item to buy', 2, true, 'free'),
  ('budget_tracker', 'Budget Tracker', 'Current spending vs budget', 3, true, 'free'),
  ('quick_stats', 'Quick Statistics', 'Shopping insights at a glance', 4, true, 'free'),
  ('meal_plan_preview', 'Meal Plan Preview', 'Upcoming meals this week', 5, true, 'free'),
  ('recent_activity', 'Recent Activity', 'Latest shopping activity', 6, true, 'free')
ON CONFLICT (widget_key) DO NOTHING;

-- Create user_widget_preferences table for per-user customization
CREATE TABLE IF NOT EXISTS user_widget_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  widget_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, widget_key)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_widget_prefs_user ON user_widget_preferences(user_id);

-- Add is_guest column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- Update existing guest users (username starts with 'guest_')
UPDATE users SET is_guest = true WHERE username LIKE 'guest_%';

COMMENT ON TABLE dashboard_widgets IS 'Available dashboard widgets and their default configuration';
COMMENT ON TABLE user_widget_preferences IS 'Per-user dashboard widget customization';
COMMENT ON COLUMN users.is_guest IS 'Whether this is a temporary guest account';
