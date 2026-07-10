-- Smart Expiration System Migration
-- Creates tables for intelligent expiration tracking and learning

-- Table: expiration_defaults
-- Stores default shelf life data for common food items
CREATE TABLE IF NOT EXISTS expiration_defaults (
  id SERIAL PRIMARY KEY,
  item_pattern VARCHAR(255) NOT NULL,  -- Pattern to match (e.g., '%chicken%', '%bread%')
  category VARCHAR(100),
  storage_location VARCHAR(50),  -- pantry, fridge, freezer
  shelf_life_days INTEGER NOT NULL,
  shelf_life_days_frozen INTEGER,  -- Optional: shelf life if frozen
  freshness_check TEXT,  -- Tips for checking freshness
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster pattern matching
CREATE INDEX idx_expiration_defaults_pattern ON expiration_defaults(item_pattern);
CREATE INDEX idx_expiration_defaults_category ON expiration_defaults(category);

-- Table: expiration_history
-- Tracks user's purchase and expiration history for learning
CREATE TABLE IF NOT EXISTS expiration_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pantry_item_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  purchase_date DATE NOT NULL,
  estimated_expiry DATE,
  actual_expiry DATE,
  expired_early BOOLEAN DEFAULT FALSE,
  still_good_after BOOLEAN DEFAULT FALSE,
  discarded BOOLEAN DEFAULT FALSE,
  discard_reason VARCHAR(255),  -- 'expired', 'spoiled', 'used', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for history queries
CREATE INDEX idx_expiration_history_user ON expiration_history(user_id);
CREATE INDEX idx_expiration_history_item ON expiration_history(item_name);
CREATE INDEX idx_expiration_history_purchase ON expiration_history(purchase_date);

-- Table: user_expiration_preferences
-- Stores learned shelf life preferences per user
CREATE TABLE IF NOT EXISTS user_expiration_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_pattern VARCHAR(255) NOT NULL,
  learned_shelf_life_days INTEGER NOT NULL,
  confidence_score FLOAT DEFAULT 0.5,  -- 0-1, higher = more data points
  sample_count INTEGER DEFAULT 1,  -- Number of data points used
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_pattern)
);

-- Index for user preferences
CREATE INDEX idx_user_expiration_prefs_user ON user_expiration_preferences(user_id);
CREATE INDEX idx_user_expiration_prefs_pattern ON user_expiration_preferences(item_pattern);

-- Add storage_location to inventory table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'storage_location'
  ) THEN
    ALTER TABLE inventory ADD COLUMN storage_location VARCHAR(50) DEFAULT 'pantry';
  END IF;
END $$;

-- Add purchase_date to inventory table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE inventory ADD COLUMN purchase_date DATE DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Add item_icon to inventory table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'item_icon'
  ) THEN
    ALTER TABLE inventory ADD COLUMN item_icon VARCHAR(10);
  END IF;
END $$;

-- Seed default expiration data
INSERT INTO expiration_defaults (item_pattern, category, storage_location, shelf_life_days, shelf_life_days_frozen, freshness_check) VALUES
-- Meats & Proteins
('%chicken%', 'Meat', 'fridge', 2, 270, 'Should smell neutral. Discard if sour or sulfur smell. Slimy texture = spoiled.'),
('%ground beef%', 'Meat', 'fridge', 2, 120, 'Should be bright red. Brown is okay, but gray/green means spoiled.'),
('%steak%', 'Meat', 'fridge', 5, 365, 'Should be bright red. Check for off odors.'),
('%beef%', 'Meat', 'fridge', 5, 180, 'Should be bright red. Brown is okay, but gray/green means spoiled.'),
('%pork%', 'Meat', 'fridge', 5, 180, 'Should be pink. Gray or green = bad. Check for sour smell.'),
('%bacon%', 'Meat', 'fridge', 7, 60, 'Should smell smoky. Slimy or sour = discard.'),
('%fish%', 'Meat', 'fridge', 2, 180, 'Should smell like the ocean. Strong fishy smell = spoiled.'),
('%salmon%', 'Meat', 'fridge', 2, 180, 'Should smell fresh. Slimy or very fishy = bad.'),
('%shrimp%', 'Meat', 'fridge', 2, 180, 'Should smell like the ocean. Ammonia smell = spoiled.'),
('%turkey%', 'Meat', 'fridge', 2, 270, 'Should smell neutral. Slimy texture = spoiled.'),
('%deli%', 'Deli', 'fridge', 5, NULL, 'Should not be slimy. Sour smell = discard.'),
('%lunch meat%', 'Deli', 'fridge', 5, NULL, 'Should not be slimy. Sour smell = discard.'),

-- Dairy & Eggs
('%milk%', 'Dairy', 'fridge', 7, NULL, 'Smell test - should be slightly sweet. Sour smell = bad.'),
('%yogurt%', 'Dairy', 'fridge', 14, NULL, 'Mold or separation beyond normal = discard.'),
('%cheese%', 'Dairy', 'fridge', 21, NULL, 'Small mold spots on hard cheese can be cut off. Soft cheese = discard all.'),
('%butter%', 'Dairy', 'fridge', 60, 270, 'Should smell fresh. Rancid smell = bad.'),
('%egg%', 'Dairy', 'fridge', 35, NULL, 'Float test - fresh eggs sink, bad eggs float.'),
('%cream%', 'Dairy', 'fridge', 7, NULL, 'Should smell fresh. Sour = discard.'),

-- Produce
('%lettuce%', 'Produce', 'fridge', 7, NULL, 'Should be crisp. Slimy or brown = discard.'),
('%tomato%', 'Produce', 'pantry', 7, NULL, 'Soft spots or mold = discard. Store at room temp for best flavor.'),
('%banana%', 'Fruits', 'pantry', 5, NULL, 'Brown spots are okay. Black and mushy = overripe.'),
('%apple%', 'Fruits', 'fridge', 60, NULL, 'Should be firm. Soft spots = starting to go bad.'),
('%berr%', 'Fruits', 'fridge', 5, NULL, 'Mold on one = discard all. Should be firm.'),
('%strawberr%', 'Fruits', 'fridge', 5, NULL, 'Mold on one = discard all. Should be firm.'),
('%carrot%', 'Produce', 'fridge', 28, NULL, 'Should be firm. Bendy or slimy = bad.'),
('%potato%', 'Produce', 'pantry', 60, NULL, 'Green spots or sprouts = toxic, discard. Store in cool, dark place.'),
('%onion%', 'Produce', 'pantry', 60, NULL, 'Should be firm. Soft or moldy = discard.'),

-- Bread & Baked Goods
('%bread%', 'Bakery', 'pantry', 7, 90, 'Check for mold. Stale is safe but not tasty.'),
('%bagel%', 'Bakery', 'pantry', 7, 90, 'Check for mold. Stale is safe but not tasty.'),
('%tortilla%', 'Bakery', 'fridge', 7, 240, 'Check for mold or sour smell.'),

-- Pantry Staples
('%pasta%', 'Pantry', 'pantry', 730, NULL, 'Dry pasta lasts years. Check for bugs.'),
('%rice%', 'Pantry', 'pantry', 1825, NULL, 'White rice lasts years. Brown rice: 6 months.'),
('%flour%', 'Pantry', 'pantry', 240, NULL, 'Should smell neutral. Rancid = discard.'),
('%sugar%', 'Pantry', 'pantry', 3650, NULL, 'Lasts indefinitely if kept dry.'),
('%honey%', 'Pantry', 'pantry', 3650, NULL, 'Never expires. Crystallization is normal.'),
('%oil%', 'Pantry', 'pantry', 180, NULL, 'Should smell neutral. Rancid smell = discard.'),
('%can%', 'Canned', 'pantry', 1825, NULL, 'Check for dents, rust, or bulging. Those = discard.'),
('%soup%', 'Canned', 'pantry', 730, NULL, 'Check for dents, rust, or bulging.'),

-- Condiments
('%ketchup%', 'Condiments', 'fridge', 180, NULL, 'Should smell normal. Mold = discard.'),
('%mustard%', 'Condiments', 'fridge', 365, NULL, 'Should smell normal. Separation is okay.'),
('%mayo%', 'Condiments', 'fridge', 60, NULL, 'Should smell neutral. Sour = discard.'),
('%sauce%', 'Condiments', 'fridge', 90, NULL, 'Check for mold or off smell.');

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for expiration_defaults
DROP TRIGGER IF EXISTS update_expiration_defaults_updated_at ON expiration_defaults;
CREATE TRIGGER update_expiration_defaults_updated_at
    BEFORE UPDATE ON expiration_defaults
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_expiration_preferences
DROP TRIGGER IF EXISTS update_user_expiration_prefs_updated_at ON user_expiration_preferences;
CREATE TRIGGER update_user_expiration_prefs_updated_at
    BEFORE UPDATE ON user_expiration_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE expiration_defaults IS 'Default shelf life data for common food items';
COMMENT ON TABLE expiration_history IS 'User purchase and expiration history for learning';
COMMENT ON TABLE user_expiration_preferences IS 'Learned shelf life preferences per user';
