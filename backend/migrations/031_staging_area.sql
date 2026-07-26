-- Migration 031: Staging Area / Floor Space System
-- Creates tables for temporary grocery storage and rotation suggestions

-- Staging area table - holds items before putting away
CREATE TABLE IF NOT EXISTS staging_area (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(50),
  category VARCHAR(100),
  storage_location VARCHAR(50) NOT NULL DEFAULT 'pantry',
  bought_date DATE DEFAULT CURRENT_DATE,
  sell_by_date DATE,
  price DECIMAL(10,2),
  store VARCHAR(255),
  icon TEXT DEFAULT '📦',
  barcode VARCHAR(100),
  notes TEXT,
  from_shopping_list_id INTEGER,
  from_shopping_list_item_id INTEGER,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rotation suggestions - smart recommendations when putting away items
CREATE TABLE IF NOT EXISTS rotation_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staging_item_id INTEGER REFERENCES staging_area(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL, -- 'use_first', 'discard', 'rotate', 'move_front', 'expires_soon'
  reason TEXT,
  priority INTEGER NOT NULL DEFAULT 2, -- 1=urgent, 2=important, 3=suggested
  action_taken BOOLEAN DEFAULT FALSE,
  action_type VARCHAR(50), -- 'discarded', 'kept', 'used', 'ignored'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staging_area_user ON staging_area(user_id);
CREATE INDEX IF NOT EXISTS idx_staging_area_location ON staging_area(storage_location);
CREATE INDEX IF NOT EXISTS idx_staging_area_added ON staging_area(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_rotation_suggestions_user ON rotation_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_rotation_suggestions_staging ON rotation_suggestions(staging_item_id);
CREATE INDEX IF NOT EXISTS idx_rotation_suggestions_priority ON rotation_suggestions(priority, action_taken);

-- Add field to shopping_list_items to track if moved to staging
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS moved_to_staging BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moved_to_staging_at TIMESTAMP;

-- Comments
COMMENT ON TABLE staging_area IS 'Temporary storage for newly purchased items before putting away';
COMMENT ON TABLE rotation_suggestions IS 'Smart suggestions for stock rotation and waste prevention';
COMMENT ON COLUMN rotation_suggestions.suggestion_type IS 'Type: use_first, discard, rotate, move_front, expires_soon';
COMMENT ON COLUMN rotation_suggestions.priority IS '1=urgent (expiring today), 2=important (expiring soon), 3=suggested (optimization)';
