-- Feature flags table for admin control
CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    feature_key VARCHAR(100) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'core', 'premium', 'experimental'
    is_enabled BOOLEAN DEFAULT TRUE,
    requires_premium BOOLEAN DEFAULT FALSE,
    free_tier_enabled BOOLEAN DEFAULT FALSE,
    premium_tier_enabled BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription tier limits (admin configurable)
CREATE TABLE IF NOT EXISTS tier_limits (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL, -- 'free', 'premium'
    limit_key VARCHAR(100) NOT NULL,
    limit_value INTEGER NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tier_name, limit_key)
);

-- Insert default feature flags
INSERT INTO feature_flags (feature_key, feature_name, description, category, requires_premium, free_tier_enabled, premium_tier_enabled, icon, display_order) VALUES
-- Core Features (Free)
('shopping_lists', 'Shopping Lists', 'Create and manage shopping lists', 'core', FALSE, TRUE, TRUE, '🛒', 1),
('kitchen_inventory', 'Kitchen Inventory', 'Track pantry, fridge, and freezer items', 'core', FALSE, TRUE, TRUE, '🏺', 2),
('categories', 'Categories', 'Organize items by category', 'core', FALSE, TRUE, TRUE, '🏷️', 3),
('dark_mode', 'Dark Mode', 'Toggle between light and dark themes', 'core', FALSE, TRUE, TRUE, '🌙', 4),
('item_icons', 'Item Icons', 'Auto-detect emoji icons for items', 'core', FALSE, TRUE, TRUE, '😊', 5),

-- Premium Features
('unlimited_lists', 'Unlimited Lists', 'Create unlimited shopping lists', 'premium', TRUE, FALSE, TRUE, '∞', 10),
('unlimited_inventory', 'Unlimited Inventory', 'Store unlimited inventory items', 'premium', TRUE, FALSE, TRUE, '📦', 11),
('unlimited_recipes', 'Unlimited Recipes', 'Save unlimited recipes', 'premium', TRUE, FALSE, TRUE, '👨‍🍳', 12),
('meal_planning', 'Meal Planning', 'Weekly meal planner', 'premium', TRUE, FALSE, TRUE, '📅', 13),
('smart_suggestions', 'Smart Suggestions', 'AI-powered item suggestions', 'premium', TRUE, FALSE, TRUE, '🤖', 14),
('multiple_stores', 'Multiple Stores', 'Configure multiple store layouts', 'premium', TRUE, FALSE, TRUE, '🏪', 15),
('price_tracking', 'Price Tracking', 'Track and analyze item prices', 'premium', TRUE, FALSE, TRUE, '💰', 16),
('barcode_scanning', 'Barcode Scanner', 'Scan barcodes to add items', 'premium', TRUE, FALSE, TRUE, '📷', 17),
('voice_input', 'Voice Input', 'Add items using voice commands', 'premium', TRUE, FALSE, TRUE, '🎤', 18),
('share_lists', 'Share Lists', 'Collaborate with family members', 'premium', TRUE, FALSE, TRUE, '👨‍👩‍👧‍👦', 19),
('export_data', 'Export Data', 'Export lists to CSV/PDF', 'premium', TRUE, FALSE, TRUE, '📄', 20),
('priority_support', 'Priority Support', 'Get faster support responses', 'premium', TRUE, FALSE, TRUE, '🎯', 21),
('expiration_tracking', 'Expiration Tracking', 'Track item expiration dates', 'premium', TRUE, FALSE, TRUE, '⏰', 22),

-- Experimental Features (can be toggled)
('recipe_import', 'Recipe Import', 'Import recipes from URLs', 'experimental', FALSE, TRUE, TRUE, '🔗', 30),
('templates', 'Item Templates', 'Quick-add from common items', 'experimental', FALSE, TRUE, TRUE, '📋', 31)
ON CONFLICT (feature_key) DO NOTHING;

-- Insert default tier limits
INSERT INTO tier_limits (tier_name, limit_key, limit_value, description) VALUES
('free', 'max_lists', 3, 'Maximum number of shopping lists'),
('free', 'max_inventory_items', 50, 'Maximum number of inventory items'),
('free', 'max_recipes', 10, 'Maximum number of recipes'),
('free', 'max_stores', 1, 'Maximum number of custom stores'),
('premium', 'max_lists', 999999, 'Unlimited shopping lists'),
('premium', 'max_inventory_items', 999999, 'Unlimited inventory items'),
('premium', 'max_recipes', 999999, 'Unlimited recipes'),
('premium', 'max_stores', 999999, 'Unlimited custom stores')
ON CONFLICT (tier_name, limit_key) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_tier_limits_tier ON tier_limits(tier_name);

-- Comments
COMMENT ON TABLE feature_flags IS 'Admin-configurable feature flags for controlling feature availability';
COMMENT ON TABLE tier_limits IS 'Admin-configurable limits for free and premium tiers';
COMMENT ON COLUMN feature_flags.free_tier_enabled IS 'Whether this feature is available to free users';
COMMENT ON COLUMN feature_flags.premium_tier_enabled IS 'Whether this feature is available to premium users';
