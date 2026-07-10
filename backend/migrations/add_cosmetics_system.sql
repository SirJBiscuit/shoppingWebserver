-- ============================================
-- COSMETICS SYSTEM DATABASE SCHEMA
-- ============================================

-- ============================================
-- 1. ICONS SYSTEM
-- ============================================

CREATE TABLE icons (
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
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_rarity (rarity),
  INDEX idx_category (category),
  INDEX idx_item_name (item_name),
  INDEX idx_quality_tier (quality_tier),
  INDEX idx_min_level (min_level)
);

CREATE TABLE user_icons (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  icon_id INTEGER REFERENCES icons(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  unlock_method VARCHAR(50), -- 'level_up', 'loot_box', 'achievement', 'purchase'
  is_favorite BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, icon_id),
  INDEX idx_user_id (user_id),
  INDEX idx_unlock_method (unlock_method)
);

-- ============================================
-- 2. XP TRANSACTION SYSTEM
-- ============================================

CREATE TABLE user_xp_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  list_id INTEGER REFERENCES shopping_lists(id) ON DELETE SET NULL,
  xp_amount INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'add_item', 'remove_item', 'complete_trip', 'scan_receipt', etc.
  metadata JSONB, -- Additional data (trip details, bonuses, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- 3. CART SKINS
-- ============================================

CREATE TABLE cart_skins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_path VARCHAR(500) NOT NULL,
  animation_type VARCHAR(50),
  particle_effect VARCHAR(50),
  sound_effect VARCHAR(100),
  screen_effect VARCHAR(50),
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  rarity VARCHAR(20) DEFAULT 'common',
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_min_level (min_level),
  INDEX idx_rarity (rarity)
);

CREATE TABLE user_cart_skins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  cart_skin_id INTEGER REFERENCES cart_skins(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, cart_skin_id),
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 4. COLOR THEMES
-- ============================================

CREATE TABLE color_themes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  primary_color VARCHAR(20) NOT NULL,
  secondary_color VARCHAR(20) NOT NULL,
  accent_color VARCHAR(20) NOT NULL,
  is_gradient BOOLEAN DEFAULT FALSE,
  gradient_colors JSONB, -- Array of colors for gradients
  has_particles BOOLEAN DEFAULT FALSE,
  particle_type VARCHAR(50),
  has_animation BOOLEAN DEFAULT FALSE,
  animation_type VARCHAR(50),
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_min_level (min_level)
);

CREATE TABLE user_color_themes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  theme_id INTEGER REFERENCES color_themes(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, theme_id),
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 5. NOTE STYLES
-- ============================================

CREATE TABLE note_styles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  font_family VARCHAR(100) NOT NULL,
  text_color VARCHAR(20) NOT NULL,
  background_color VARCHAR(20) NOT NULL,
  background_texture VARCHAR(100),
  has_shadow BOOLEAN DEFAULT FALSE,
  has_particles BOOLEAN DEFAULT FALSE,
  particle_type VARCHAR(50),
  has_animation BOOLEAN DEFAULT FALSE,
  animation_type VARCHAR(50),
  sound_effect VARCHAR(100),
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_min_level (min_level)
);

CREATE TABLE user_note_styles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  note_style_id INTEGER REFERENCES note_styles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, note_style_id),
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 6. BORDER STYLES
-- ============================================

CREATE TABLE border_styles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  border_type VARCHAR(50) NOT NULL, -- 'solid', 'dashed', 'dotted', 'gradient'
  border_width INTEGER NOT NULL DEFAULT 2,
  border_color VARCHAR(20),
  is_gradient BOOLEAN DEFAULT FALSE,
  gradient_colors JSONB,
  has_glow BOOLEAN DEFAULT FALSE,
  has_animation BOOLEAN DEFAULT FALSE,
  animation_type VARCHAR(50),
  has_particles BOOLEAN DEFAULT FALSE,
  particle_type VARCHAR(50),
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_min_level (min_level)
);

CREATE TABLE user_border_styles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  border_style_id INTEGER REFERENCES border_styles(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, border_style_id),
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 7. BACKGROUND PATTERNS
-- ============================================

CREATE TABLE background_patterns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  pattern_type VARCHAR(50) NOT NULL, -- 'solid', 'pattern', 'gradient', 'particles', 'video'
  pattern_data JSONB NOT NULL, -- Pattern-specific configuration
  has_animation BOOLEAN DEFAULT FALSE,
  animation_type VARCHAR(50),
  video_path VARCHAR(500),
  opacity DECIMAL(3,2) DEFAULT 1.0,
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_min_level (min_level),
  INDEX idx_pattern_type (pattern_type)
);

CREATE TABLE user_background_patterns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  background_id INTEGER REFERENCES background_patterns(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, background_id),
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 8. CHECK MARK ANIMATIONS
-- ============================================

CREATE TABLE check_animations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  animation_type VARCHAR(50) NOT NULL,
  duration DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  has_particles BOOLEAN DEFAULT FALSE,
  particle_type VARCHAR(50),
  particle_count INTEGER DEFAULT 0,
  has_sound BOOLEAN DEFAULT FALSE,
  sound_effect VARCHAR(100),
  has_screen_shake BOOLEAN DEFAULT FALSE,
  has_screen_effect BOOLEAN DEFAULT FALSE,
  screen_effect_type VARCHAR(50),
  min_level INTEGER NOT NULL DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_min_level (min_level)
);

CREATE TABLE user_check_animations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  animation_id INTEGER REFERENCES check_animations(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, animation_id),
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 9. LOOT BOXES
-- ============================================

CREATE TABLE loot_box_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  box_type VARCHAR(50) NOT NULL, -- 'free_weekly', 'premium_daily', 'premium_weekly', 'premium_monthly'
  rarity_weights JSONB NOT NULL, -- Probability distribution for rarities
  guaranteed_items JSONB, -- Guaranteed rewards
  min_items INTEGER NOT NULL DEFAULT 1,
  max_items INTEGER NOT NULL DEFAULT 5,
  xp_bonus INTEGER DEFAULT 0,
  premium_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_loot_boxes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  box_type_id INTEGER REFERENCES loot_box_types(id) ON DELETE CASCADE,
  opened_at TIMESTAMP DEFAULT NOW(),
  rewards JSONB NOT NULL, -- Array of rewards received
  
  INDEX idx_user_id (user_id),
  INDEX idx_opened_at (opened_at)
);

CREATE TABLE user_loot_box_timers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  box_type VARCHAR(50) NOT NULL,
  last_opened TIMESTAMP NOT NULL,
  
  UNIQUE(user_id, box_type),
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 10. USER CUSTOMIZATION PREFERENCES
-- ============================================

CREATE TABLE user_customization (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  active_icon_set VARCHAR(50) DEFAULT 'default',
  active_cart_skin_id INTEGER REFERENCES cart_skins(id) ON DELETE SET NULL,
  active_theme_id INTEGER REFERENCES color_themes(id) ON DELETE SET NULL,
  active_note_style_id INTEGER REFERENCES note_styles(id) ON DELETE SET NULL,
  active_border_style_id INTEGER REFERENCES border_styles(id) ON DELETE SET NULL,
  active_background_id INTEGER REFERENCES background_patterns(id) ON DELETE SET NULL,
  active_check_animation_id INTEGER REFERENCES check_animations(id) ON DELETE SET NULL,
  custom_settings JSONB, -- Additional custom preferences
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 11. ACHIEVEMENTS (Extended for cosmetics)
-- ============================================

ALTER TABLE achievements ADD COLUMN IF NOT EXISTS cosmetic_reward_type VARCHAR(50);
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS cosmetic_reward_id INTEGER;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS icon_reward_ids INTEGER[];

-- ============================================
-- 12. USER STATS (Extended for cosmetics)
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS total_icons_unlocked INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_cosmetics_unlocked INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS icon_collection_value INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_loot_box_free TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_loot_box_premium_daily TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_loot_box_premium_weekly TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_loot_box_premium_monthly TIMESTAMP;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_user_icons_user_unlocked ON user_icons(user_id, unlocked_at DESC);
CREATE INDEX idx_xp_transactions_user_date ON user_xp_transactions(user_id, created_at DESC);
CREATE INDEX idx_icons_quality_level ON icons(quality_tier, min_level);
CREATE INDEX idx_cosmetics_level_premium ON cart_skins(min_level, premium_only);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update user icon count
CREATE OR REPLACE FUNCTION update_user_icon_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users 
    SET total_icons_unlocked = total_icons_unlocked + 1,
        total_cosmetics_unlocked = total_cosmetics_unlocked + 1
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users 
    SET total_icons_unlocked = total_icons_unlocked - 1,
        total_cosmetics_unlocked = total_cosmetics_unlocked - 1
    WHERE id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_icon_count
AFTER INSERT OR DELETE ON user_icons
FOR EACH ROW EXECUTE FUNCTION update_user_icon_count();

-- Function to update customization timestamp
CREATE OR REPLACE FUNCTION update_customization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customization_updated
BEFORE UPDATE ON user_customization
FOR EACH ROW EXECUTE FUNCTION update_customization_timestamp();

-- ============================================
-- SEED DATA - DEFAULT COSMETICS
-- ============================================

-- Default cart skin
INSERT INTO cart_skins (name, description, image_path, min_level, premium_only)
VALUES ('Basic Cart', 'The classic shopping cart', '/assets/carts/basic.png', 0, FALSE);

-- Default theme
INSERT INTO color_themes (name, description, primary_color, secondary_color, accent_color, min_level, premium_only)
VALUES ('Classic Blue', 'The original Listzy theme', '#3B82F6', '#8B5CF6', '#10B981', 0, FALSE);

-- Default note style
INSERT INTO note_styles (name, description, font_family, text_color, background_color, min_level, premium_only)
VALUES ('Plain Text', 'Simple and clean', 'Inter', '#000000', '#FFFFFF', 0, FALSE);

-- Default border
INSERT INTO border_styles (name, description, border_type, border_width, border_color, min_level, premium_only)
VALUES ('None', 'No border', 'solid', 0, 'transparent', 0, FALSE);

-- Default background
INSERT INTO background_patterns (name, description, pattern_type, pattern_data, min_level, premium_only)
VALUES ('Solid White', 'Clean white background', 'solid', '{"color": "#FFFFFF"}', 0, FALSE);

-- Default check animation
INSERT INTO check_animations (name, description, animation_type, duration, min_level, premium_only)
VALUES ('Simple Check', 'Quick fade animation', 'fade', 0.3, 0, FALSE);

-- Loot box types
INSERT INTO loot_box_types (name, description, box_type, rarity_weights, guaranteed_items, min_items, max_items, xp_bonus, premium_only)
VALUES 
  ('Free Weekly Box', 'One free box per week', 'free_weekly', 
   '{"common": 0.7, "uncommon": 0.25, "rare": 0.05}', 
   '{"uncommon": 1}', 3, 4, 100, FALSE),
  
  ('Premium Daily Box', 'Daily box for premium members', 'premium_daily',
   '{"uncommon": 0.6, "rare": 0.25, "epic": 0.15}',
   '{"rare": 1}', 2, 3, 200, TRUE),
  
  ('Premium Weekly Box', 'Weekly mega box for premium', 'premium_weekly',
   '{"rare": 0.5, "epic": 0.35, "legendary": 0.15}',
   '{"rare": 1, "epic": 2}', 3, 4, 500, TRUE),
  
  ('Premium Monthly Box', 'Monthly legendary box', 'premium_monthly',
   '{"epic": 0.6, "legendary": 0.35, "mythical": 0.05}',
   '{"legendary": 1, "epic": 3}', 4, 5, 1000, TRUE);

COMMIT;
