-- Kitchen Inventory System Revamp
-- Adds custom storage locations, enhanced expiration tracking, and learning algorithm

-- ============================================
-- 1. Custom Storage Locations
-- ============================================

CREATE TABLE IF NOT EXISTS custom_storage_locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '📦',
  color VARCHAR(7) DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_custom_locations_user ON custom_storage_locations(user_id, sort_order);

-- ============================================
-- 2. Enhance Inventory Table
-- ============================================

-- Add new columns to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS custom_location_id INTEGER REFERENCES custom_storage_locations(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS bought_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS opened_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS is_opened BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS manual_expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS estimated_expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS actual_expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_confidence INTEGER DEFAULT 0 CHECK (expiry_confidence >= 0 AND expiry_confidence <= 100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS store VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_user_location ON inventory(user_id, storage_location);
CREATE INDEX IF NOT EXISTS idx_inventory_custom_location ON inventory(custom_location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(estimated_expiry_date) WHERE estimated_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode) WHERE barcode IS NOT NULL;

-- ============================================
-- 3. Expiration Learning System
-- ============================================

CREATE TABLE IF NOT EXISTS item_expiration_learning (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  storage_location VARCHAR(50) NOT NULL,
  bought_date DATE NOT NULL,
  opened_date DATE,
  estimated_expiry_date DATE NOT NULL,
  actual_expiry_date DATE NOT NULL,
  estimated_shelf_life INTEGER NOT NULL, -- days
  actual_shelf_life INTEGER NOT NULL, -- days
  difference INTEGER NOT NULL, -- actual - estimated
  confidence_before INTEGER DEFAULT 0,
  confidence_after INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_user_item ON item_expiration_learning(user_id, item_name, storage_location);
CREATE INDEX idx_learning_created ON item_expiration_learning(created_at DESC);

-- ============================================
-- 4. Inventory History (for analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  storage_location VARCHAR(50),
  custom_location_id INTEGER REFERENCES custom_storage_locations(id) ON DELETE SET NULL,
  category VARCHAR(100),
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  bought_date DATE,
  opened_date DATE,
  expiry_date DATE,
  removed_date DATE DEFAULT CURRENT_DATE,
  removal_reason VARCHAR(50), -- consumed, expired, thrown_out, moved_to_shopping_list
  price DECIMAL(10,2),
  store VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_user ON inventory_history(user_id, removed_date DESC);
CREATE INDEX idx_history_reason ON inventory_history(removal_reason);

-- ============================================
-- 5. Default Expiration Times (system-wide)
-- ============================================

CREATE TABLE IF NOT EXISTS default_expiration_times (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  storage_location VARCHAR(50) NOT NULL,
  shelf_life_days INTEGER NOT NULL CHECK (shelf_life_days > 0),
  confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  source VARCHAR(100) DEFAULT 'system', -- USDA, FDA, user_contributed, system
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_name, storage_location)
);

CREATE INDEX idx_default_expiry_item ON default_expiration_times(item_name, storage_location);
CREATE INDEX idx_default_expiry_category ON default_expiration_times(category, storage_location);

-- ============================================
-- 6. Seed Default Expiration Data
-- ============================================

INSERT INTO default_expiration_times (item_name, category, storage_location, shelf_life_days, confidence, source) VALUES
-- Dairy & Eggs
('milk', 'Dairy & Eggs', 'fridge', 7, 90, 'USDA'),
('milk', 'Dairy & Eggs', 'pantry', 1, 90, 'USDA'),
('eggs', 'Dairy & Eggs', 'fridge', 21, 90, 'USDA'),
('eggs', 'Dairy & Eggs', 'pantry', 7, 80, 'USDA'),
('cheese', 'Dairy & Eggs', 'fridge', 14, 85, 'USDA'),
('yogurt', 'Dairy & Eggs', 'fridge', 10, 85, 'USDA'),
('butter', 'Dairy & Eggs', 'fridge', 30, 90, 'USDA'),
('butter', 'Dairy & Eggs', 'freezer', 180, 85, 'USDA'),

-- Meat & Seafood
('chicken', 'Meat & Seafood', 'fridge', 2, 95, 'USDA'),
('chicken', 'Meat & Seafood', 'freezer', 180, 90, 'USDA'),
('beef', 'Meat & Seafood', 'fridge', 3, 95, 'USDA'),
('beef', 'Meat & Seafood', 'freezer', 180, 90, 'USDA'),
('pork', 'Meat & Seafood', 'fridge', 3, 95, 'USDA'),
('pork', 'Meat & Seafood', 'freezer', 180, 90, 'USDA'),
('fish', 'Meat & Seafood', 'fridge', 1, 95, 'USDA'),
('fish', 'Meat & Seafood', 'freezer', 90, 90, 'USDA'),
('shrimp', 'Meat & Seafood', 'fridge', 2, 90, 'USDA'),
('shrimp', 'Meat & Seafood', 'freezer', 90, 90, 'USDA'),

-- Produce
('lettuce', 'Produce', 'fridge', 5, 80, 'USDA'),
('tomatoes', 'Produce', 'pantry', 5, 75, 'USDA'),
('tomatoes', 'Produce', 'fridge', 7, 80, 'USDA'),
('apples', 'Produce', 'pantry', 7, 80, 'USDA'),
('apples', 'Produce', 'fridge', 21, 85, 'USDA'),
('bananas', 'Produce', 'pantry', 5, 75, 'system'),
('oranges', 'Produce', 'pantry', 10, 80, 'USDA'),
('carrots', 'Produce', 'fridge', 21, 85, 'USDA'),
('potatoes', 'Produce', 'pantry', 30, 85, 'USDA'),
('onions', 'Produce', 'pantry', 30, 85, 'USDA'),
('garlic', 'Produce', 'pantry', 90, 85, 'USDA'),

-- Bakery
('bread', 'Bakery & Bread', 'pantry', 5, 80, 'system'),
('bread', 'Bakery & Bread', 'fridge', 10, 85, 'system'),
('bread', 'Bakery & Bread', 'freezer', 90, 85, 'system'),
('bagels', 'Bakery & Bread', 'pantry', 5, 80, 'system'),
('bagels', 'Bakery & Bread', 'freezer', 90, 85, 'system'),

-- Leftovers
('leftovers', 'Leftovers', 'fridge', 3, 70, 'FDA'),
('cooked rice', 'Leftovers', 'fridge', 4, 80, 'FDA'),
('cooked pasta', 'Leftovers', 'fridge', 3, 80, 'FDA'),
('soup', 'Leftovers', 'fridge', 3, 80, 'FDA'),
('pizza', 'Leftovers', 'fridge', 4, 75, 'system')

ON CONFLICT (item_name, storage_location) DO NOTHING;

-- ============================================
-- 7. Triggers for Updated Timestamps
-- ============================================

-- Trigger for custom_storage_locations
CREATE OR REPLACE FUNCTION update_custom_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_location_updated
BEFORE UPDATE ON custom_storage_locations
FOR EACH ROW
EXECUTE FUNCTION update_custom_location_timestamp();

-- Trigger for default_expiration_times
CREATE OR REPLACE FUNCTION update_default_expiry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_default_expiry_updated
BEFORE UPDATE ON default_expiration_times
FOR EACH ROW
EXECUTE FUNCTION update_default_expiry_timestamp();

-- ============================================
-- 8. Comments for Documentation
-- ============================================

COMMENT ON TABLE custom_storage_locations IS 'User-defined custom storage locations (e.g., Shelf 1, Wine Rack)';
COMMENT ON TABLE item_expiration_learning IS 'Tracks user feedback on expiration dates to improve future estimates';
COMMENT ON TABLE inventory_history IS 'Historical record of inventory items for analytics and waste tracking';
COMMENT ON TABLE default_expiration_times IS 'System-wide default expiration times for common items';

COMMENT ON COLUMN inventory.custom_location_id IS 'Reference to user-defined custom storage location';
COMMENT ON COLUMN inventory.bought_date IS 'Date item was purchased';
COMMENT ON COLUMN inventory.opened_date IS 'Date item was opened (for tracking shelf life after opening)';
COMMENT ON COLUMN inventory.is_opened IS 'Whether the item has been opened';
COMMENT ON COLUMN inventory.manual_expiry_date IS 'User-set expiration date (overrides calculated)';
COMMENT ON COLUMN inventory.estimated_expiry_date IS 'System-calculated expiration date';
COMMENT ON COLUMN inventory.actual_expiry_date IS 'Actual date item went bad (for learning)';
COMMENT ON COLUMN inventory.expiry_confidence IS 'Confidence level of expiration estimate (0-100%)';
COMMENT ON COLUMN inventory.sort_order IS 'Custom sort order within storage location';

-- ============================================
-- 9. Grant Permissions
-- ============================================

-- Grant permissions to shopuser (if needed)
-- GRANT ALL PRIVILEGES ON custom_storage_locations TO shopuser;
-- GRANT ALL PRIVILEGES ON item_expiration_learning TO shopuser;
-- GRANT ALL PRIVILEGES ON inventory_history TO shopuser;
-- GRANT ALL PRIVILEGES ON default_expiration_times TO shopuser;

-- ============================================
-- Migration Complete
-- ============================================

-- Analyze tables for query optimization
ANALYZE custom_storage_locations;
ANALYZE inventory;
ANALYZE item_expiration_learning;
ANALYZE inventory_history;
ANALYZE default_expiration_times;
