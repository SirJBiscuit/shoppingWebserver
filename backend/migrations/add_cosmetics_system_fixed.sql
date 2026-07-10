-- ============================================
-- COSMETICS SYSTEM DATABASE SCHEMA (PostgreSQL Fixed)
-- ============================================

BEGIN;

-- ============================================
-- 1. ICONS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS icons (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical')),
  variant VARCHAR(50),
  category VARCHAR(50),
  filename VARCHAR(255) NOT NULL UNIQUE,
  file_path VARCHAR(500) NOT NULL,
  quality_tier INTEGER NOT NULL DEFAULT 1 CHECK (quality_tier BETWEEN 1 AND 7),
  min_level INTEGER NOT NULL DEFAULT 0,
  animated BOOLEAN DEFAULT FALSE,
  has_particles BOOLEAN DEFAULT FALSE,
  has_sound BOOLEAN DEFAULT FALSE,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icons_rarity ON icons(rarity);
CREATE INDEX IF NOT EXISTS idx_icons_category ON icons(category);
CREATE INDEX IF NOT EXISTS idx_icons_item_name ON icons(item_name);
CREATE INDEX IF NOT EXISTS idx_icons_quality_tier ON icons(quality_tier);
CREATE INDEX IF NOT EXISTS idx_icons_min_level ON icons(min_level);

CREATE TABLE IF NOT EXISTS user_icons (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  icon_id INTEGER REFERENCES icons(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  unlock_method VARCHAR(50),
  is_favorite BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, icon_id)
);

CREATE INDEX IF NOT EXISTS idx_user_icons_user_id ON user_icons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_icons_unlock_method ON user_icons(unlock_method);

-- ============================================
-- 2. XP TRANSACTION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS user_xp_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  xp_amount INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_user_id ON user_xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_action_type ON user_xp_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_xp_created_at ON user_xp_transactions(created_at);

-- ============================================
-- 3. CART SKINS
-- ============================================

CREATE TABLE IF NOT EXISTS cart_skins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_path VARCHAR(500) NOT NULL,
  animation_type VARCHAR(50),
  particle_effect VARCHAR(50),
  sound_effect VARCHAR(100),
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_skins_min_level ON cart_skins(min_level);
CREATE INDEX IF NOT EXISTS idx_cart_skins_premium ON cart_skins(premium_only);

CREATE TABLE IF NOT EXISTS user_cart_skins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  skin_id INTEGER REFERENCES cart_skins(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, skin_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cart_skins_user_id ON user_cart_skins(user_id);

-- ============================================
-- 4. COLOR THEMES
-- ============================================

CREATE TABLE IF NOT EXISTS color_themes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  accent_color VARCHAR(7) NOT NULL,
  is_gradient BOOLEAN DEFAULT FALSE,
  has_particles BOOLEAN DEFAULT FALSE,
  has_animation BOOLEAN DEFAULT FALSE,
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_color_themes_min_level ON color_themes(min_level);

CREATE TABLE IF NOT EXISTS user_color_themes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  theme_id INTEGER REFERENCES color_themes(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_user_color_themes_user_id ON user_color_themes(user_id);

-- ============================================
-- 5. NOTE STYLES
-- ============================================

CREATE TABLE IF NOT EXISTS note_styles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  font_family VARCHAR(100),
  text_decoration VARCHAR(50),
  background_style VARCHAR(50),
  border_style VARCHAR(50),
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_styles_min_level ON note_styles(min_level);

CREATE TABLE IF NOT EXISTS user_note_styles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  style_id INTEGER REFERENCES note_styles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, style_id)
);

CREATE INDEX IF NOT EXISTS idx_user_note_styles_user_id ON user_note_styles(user_id);

-- ============================================
-- 6. BORDER STYLES
-- ============================================

CREATE TABLE IF NOT EXISTS border_styles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  border_type VARCHAR(50),
  border_width VARCHAR(20),
  border_color VARCHAR(7),
  border_radius VARCHAR(20),
  has_animation BOOLEAN DEFAULT FALSE,
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_border_styles_min_level ON border_styles(min_level);

CREATE TABLE IF NOT EXISTS user_border_styles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  style_id INTEGER REFERENCES border_styles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, style_id)
);

CREATE INDEX IF NOT EXISTS idx_user_border_styles_user_id ON user_border_styles(user_id);

-- ============================================
-- 7. BACKGROUND PATTERNS
-- ============================================

CREATE TABLE IF NOT EXISTS background_patterns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  pattern_type VARCHAR(50),
  image_path VARCHAR(500),
  has_animation BOOLEAN DEFAULT FALSE,
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_patterns_min_level ON background_patterns(min_level);

CREATE TABLE IF NOT EXISTS user_background_patterns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pattern_id INTEGER REFERENCES background_patterns(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, pattern_id)
);

CREATE INDEX IF NOT EXISTS idx_user_background_patterns_user_id ON user_background_patterns(user_id);

-- ============================================
-- 8. CHECK ANIMATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS check_animations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  animation_type VARCHAR(50),
  duration_ms INTEGER DEFAULT 500,
  has_sound BOOLEAN DEFAULT FALSE,
  sound_path VARCHAR(500),
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_animations_min_level ON check_animations(min_level);

CREATE TABLE IF NOT EXISTS user_check_animations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  animation_id INTEGER REFERENCES check_animations(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, animation_id)
);

CREATE INDEX IF NOT EXISTS idx_user_check_animations_user_id ON user_check_animations(user_id);

-- ============================================
-- 9. LOOT BOX SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS loot_box_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  cost_xp INTEGER,
  cost_premium_currency INTEGER,
  cooldown_hours INTEGER,
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_loot_boxes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  box_type_id INTEGER REFERENCES loot_box_types(id) ON DELETE CASCADE,
  opened_at TIMESTAMP DEFAULT NOW(),
  rewards JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_loot_boxes_user_id ON user_loot_boxes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_loot_boxes_opened_at ON user_loot_boxes(opened_at);

-- ============================================
-- 10. USER CUSTOMIZATION PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS user_customization (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  active_theme_id INTEGER REFERENCES color_themes(id),
  active_cart_skin_id INTEGER REFERENCES cart_skins(id),
  active_note_style_id INTEGER REFERENCES note_styles(id),
  active_border_style_id INTEGER REFERENCES border_styles(id),
  active_background_id INTEGER REFERENCES background_patterns(id),
  active_check_animation_id INTEGER REFERENCES check_animations(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_customization_user_id ON user_customization(user_id);

-- ============================================
-- 11. SEED DATA
-- ============================================

-- Default Cart Skins
INSERT INTO cart_skins (name, description, image_path, min_level, premium_only) VALUES
  ('Basic Cart', 'The classic shopping cart', '/assets/carts/basic.png', 0, FALSE),
  ('Wooden Cart', 'Rustic wooden cart', '/assets/carts/wooden.png', 5, FALSE),
  ('Metal Cart', 'Shiny metal cart', '/assets/carts/metal.png', 10, FALSE),
  ('Golden Cart', 'Luxurious golden cart', '/assets/carts/golden.png', 20, FALSE),
  ('Rocket Cart', 'Blast off with style!', '/assets/carts/rocket.png', 30, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Default Color Themes
INSERT INTO color_themes (name, description, primary_color, secondary_color, accent_color, min_level, premium_only) VALUES
  ('Classic Blue', 'The original Listzy theme', '#3B82F6', '#8B5CF6', '#10B981', 0, FALSE),
  ('Sunset Orange', 'Warm sunset colors', '#F59E0B', '#EF4444', '#EC4899', 3, FALSE),
  ('Forest Green', 'Natural forest vibes', '#10B981', '#059669', '#34D399', 7, FALSE),
  ('Ocean Blue', 'Deep ocean colors', '#0EA5E9', '#06B6D4', '#22D3EE', 15, FALSE),
  ('Neon Nights', 'Vibrant neon glow', '#FF00FF', '#00FFFF', '#FFFF00', 40, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Loot Box Types
INSERT INTO loot_box_types (name, description, cooldown_hours, min_level, premium_only) VALUES
  ('Free Weekly Box', 'Free loot box available weekly', 168, 0, FALSE),
  ('Premium Daily Box', 'Daily loot box for premium users', 24, 0, TRUE),
  ('Premium Weekly Box', 'Weekly premium loot box', 168, 0, TRUE),
  ('Premium Monthly Box', 'Monthly premium mega box', 720, 0, TRUE)
ON CONFLICT (name) DO NOTHING;

COMMIT;
