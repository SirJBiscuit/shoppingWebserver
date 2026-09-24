-- Complete Bug Fix SQL Script
-- Run this to fix all database-related issues

-- ============================================
-- 1. Fix Add Item Black Screen
-- ============================================

-- Add item_icon column if missing
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS item_icon VARCHAR(255);

-- Add any other potentially missing columns
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- 2. Fix Home Inventory / Pantry
-- ============================================

-- Ensure pantry_inventory has all required columns
ALTER TABLE pantry_inventory 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

ALTER TABLE pantry_inventory 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE pantry_inventory 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

ALTER TABLE pantry_inventory 
ADD COLUMN IF NOT EXISTS storage_location VARCHAR(50) DEFAULT 'pantry';

ALTER TABLE pantry_inventory 
ADD COLUMN IF NOT EXISTS profile_id INTEGER;

-- Fix unique constraint (remove if exists, add correct one)
ALTER TABLE pantry_inventory 
DROP CONSTRAINT IF EXISTS pantry_inventory_user_id_profile_id_item_name_key;

ALTER TABLE pantry_inventory 
ADD CONSTRAINT pantry_inventory_user_item_unique 
UNIQUE (user_id, item_name, storage_location);

-- ============================================
-- 3. Fix Shopping List Recipes
-- ============================================

-- Add is_completed column if missing
ALTER TABLE shopping_list_recipes 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- ============================================
-- 4. Create AVE Tables (if missing)
-- ============================================

CREATE TABLE IF NOT EXISTS ave_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  layout_name VARCHAR(100) DEFAULT 'default',
  layout JSONB NOT NULL,
  version VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ave_layouts_user ON ave_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_ave_layouts_active ON ave_layouts(user_id, is_active);

CREATE TABLE IF NOT EXISTS ave_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ave_snapshots_user ON ave_snapshots(user_id);

-- ============================================
-- 5. Ensure Beta Tables Exist
-- ============================================

CREATE TABLE IF NOT EXISTS beta_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_codes_code ON beta_codes(code);
CREATE INDEX IF NOT EXISTS idx_beta_codes_active ON beta_codes(is_active);

CREATE TABLE IF NOT EXISTS beta_testers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  beta_code_id INTEGER REFERENCES beta_codes(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  feedback_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_beta_testers_user ON beta_testers(user_id);

CREATE TABLE IF NOT EXISTS beta_feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50),
  title VARCHAR(255),
  description TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON beta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON beta_feedback(feedback_type);

-- ============================================
-- 6. Ensure MDL Tables Exist (for ASI)
-- ============================================

-- These should already exist from migrations 039 & 040
-- But we'll check and create if missing

CREATE TABLE IF NOT EXISTS store_locations (
  id SERIAL PRIMARY KEY,
  chain_name VARCHAR(100),
  store_name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  total_aisles INTEGER,
  aisle_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_locations_chain ON store_locations(chain_name);
CREATE INDEX IF NOT EXISTS idx_store_locations_city_state ON store_locations(city, state);

CREATE TABLE IF NOT EXISTS mdl_aisle_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  aisle_number VARCHAR(20) NOT NULL,
  store_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
  category_id INTEGER,
  was_correct BOOLEAN,
  confidence_before DECIMAL(3, 2),
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aisle_reports_item_store ON mdl_aisle_reports(item_name, store_id);
CREATE INDEX IF NOT EXISTS idx_aisle_reports_user ON mdl_aisle_reports(user_id);

CREATE TABLE IF NOT EXISTS mdl_location_aisles (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  store_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
  aisle_number VARCHAR(20) NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 0.5,
  total_reports INTEGER DEFAULT 1,
  correct_reports INTEGER DEFAULT 0,
  last_reported TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_name, store_id)
);

CREATE INDEX IF NOT EXISTS idx_location_aisles_item ON mdl_location_aisles(item_name);
CREATE INDEX IF NOT EXISTS idx_location_aisles_store ON mdl_location_aisles(store_id);
CREATE INDEX IF NOT EXISTS idx_location_aisles_confidence ON mdl_location_aisles(confidence DESC);

-- ============================================
-- 7. Fix any missing indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list ON shopping_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_checked ON shopping_list_items(is_checked);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_inventory_user ON pantry_inventory(user_id);

-- ============================================
-- 8. Update timestamps
-- ============================================

-- Ensure updated_at triggers exist for key tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables that need it
DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at 
BEFORE UPDATE ON shopping_lists 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ave_layouts_updated_at ON ave_layouts;
CREATE TRIGGER update_ave_layouts_updated_at 
BEFORE UPDATE ON ave_layouts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_locations_updated_at ON store_locations;
CREATE TRIGGER update_store_locations_updated_at 
BEFORE UPDATE ON store_locations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Done!
-- ============================================

SELECT 'All database fixes applied successfully!' AS status;
