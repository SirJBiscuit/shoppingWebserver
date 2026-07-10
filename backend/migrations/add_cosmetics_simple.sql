-- ============================================
-- COSMETICS SYSTEM - SIMPLE MIGRATION
-- Skip loot_box_types (already exists)
-- ============================================

BEGIN;

-- Check what tables exist
DO $$ 
BEGIN
    -- Icons
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'icons') THEN
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
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_icons_rarity ON icons(rarity);
        CREATE INDEX idx_icons_category ON icons(category);
        CREATE INDEX idx_icons_item_name ON icons(item_name);
        CREATE INDEX idx_icons_quality_tier ON icons(quality_tier);
        CREATE INDEX idx_icons_min_level ON icons(min_level);
    END IF;

    -- User Icons
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_icons') THEN
        CREATE TABLE user_icons (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          icon_id INTEGER REFERENCES icons(id) ON DELETE CASCADE,
          unlocked_at TIMESTAMP DEFAULT NOW(),
          unlock_method VARCHAR(50),
          is_favorite BOOLEAN DEFAULT FALSE,
          UNIQUE(user_id, icon_id)
        );
        
        CREATE INDEX idx_user_icons_user_id ON user_icons(user_id);
        CREATE INDEX idx_user_icons_unlock_method ON user_icons(unlock_method);
    END IF;

    -- XP Transactions
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_xp_transactions') THEN
        CREATE TABLE user_xp_transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          action_type VARCHAR(50) NOT NULL,
          xp_amount INTEGER NOT NULL,
          description TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_xp_user_id ON user_xp_transactions(user_id);
        CREATE INDEX idx_xp_action_type ON user_xp_transactions(action_type);
        CREATE INDEX idx_xp_created_at ON user_xp_transactions(created_at);
    END IF;

    -- Cart Skins
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cart_skins') THEN
        CREATE TABLE cart_skins (
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
        
        CREATE INDEX idx_cart_skins_min_level ON cart_skins(min_level);
        CREATE INDEX idx_cart_skins_premium ON cart_skins(premium_only);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_cart_skins') THEN
        CREATE TABLE user_cart_skins (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          skin_id INTEGER REFERENCES cart_skins(id) ON DELETE CASCADE,
          unlocked_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, skin_id)
        );
        
        CREATE INDEX idx_user_cart_skins_user_id ON user_cart_skins(user_id);
    END IF;

    -- Color Themes
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'color_themes') THEN
        CREATE TABLE color_themes (
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
        
        CREATE INDEX idx_color_themes_min_level ON color_themes(min_level);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_color_themes') THEN
        CREATE TABLE user_color_themes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          theme_id INTEGER REFERENCES color_themes(id) ON DELETE CASCADE,
          unlocked_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, theme_id)
        );
        
        CREATE INDEX idx_user_color_themes_user_id ON user_color_themes(user_id);
    END IF;

    -- User Customization
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_customization') THEN
        CREATE TABLE user_customization (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          active_theme_id INTEGER REFERENCES color_themes(id),
          active_cart_skin_id INTEGER REFERENCES cart_skins(id),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_user_customization_user_id ON user_customization(user_id);
    END IF;

END $$;

-- Seed Data
INSERT INTO cart_skins (name, description, image_path, min_level, premium_only) VALUES
  ('Basic Cart', 'The classic shopping cart', '/assets/carts/basic.png', 0, FALSE),
  ('Wooden Cart', 'Rustic wooden cart', '/assets/carts/wooden.png', 5, FALSE),
  ('Metal Cart', 'Shiny metal cart', '/assets/carts/metal.png', 10, FALSE),
  ('Golden Cart', 'Luxurious golden cart', '/assets/carts/golden.png', 20, FALSE),
  ('Rocket Cart', 'Blast off with style!', '/assets/carts/rocket.png', 30, TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO color_themes (name, description, primary_color, secondary_color, accent_color, min_level, premium_only) VALUES
  ('Classic Blue', 'The original Listzy theme', '#3B82F6', '#8B5CF6', '#10B981', 0, FALSE),
  ('Sunset Orange', 'Warm sunset colors', '#F59E0B', '#EF4444', '#EC4899', 3, FALSE),
  ('Forest Green', 'Natural forest vibes', '#10B981', '#059669', '#34D399', 7, FALSE),
  ('Ocean Blue', 'Deep ocean colors', '#0EA5E9', '#06B6D4', '#22D3EE', 15, FALSE),
  ('Neon Nights', 'Vibrant neon glow', '#FF00FF', '#00FFFF', '#FFFF00', 40, TRUE)
ON CONFLICT (name) DO NOTHING;

COMMIT;
