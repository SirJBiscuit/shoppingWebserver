-- Migration 035: Create MDL (Massive Data List) System
-- Product master database with food icons integration

-- 1. Product Master Data Table
CREATE TABLE IF NOT EXISTS product_master_data (
  id SERIAL PRIMARY KEY,
  product_name VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  
  -- Pricing data
  default_price_low DECIMAL(10,2),
  default_price_high DECIMAL(10,2),
  average_price DECIMAL(10,2),
  price_confidence INTEGER DEFAULT 0 CHECK (price_confidence >= 0 AND price_confidence <= 100),
  
  -- Store data
  best_store VARCHAR(255),
  common_stores TEXT[], -- Array of store names
  
  -- Product details
  common_size VARCHAR(50),
  common_unit VARCHAR(50),
  typical_shelf_life_days INTEGER,
  typical_location VARCHAR(50), -- pantry, fridge, freezer
  
  -- Icon data
  icon_emoji VARCHAR(10),
  icon_image_url TEXT, -- URL to 3D food icon
  icon_filename VARCHAR(255), -- Filename in public/food-icons/optimized/
  
  -- Metadata
  keywords TEXT[], -- Search keywords
  notes TEXT,
  times_purchased INTEGER DEFAULT 0,
  last_price_update TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Price History for MDL (track price changes over time)
CREATE TABLE IF NOT EXISTS mdl_price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES product_master_data(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  store VARCHAR(255),
  source VARCHAR(50), -- 'user_input', 'learned', 'api', 'manual'
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Preferences for Products (override MDL defaults)
CREATE TABLE IF NOT EXISTS user_product_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES product_master_data(id) ON DELETE CASCADE,
  preferred_store VARCHAR(255),
  preferred_size VARCHAR(50),
  preferred_price DECIMAL(10,2),
  preferred_location VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mdl_product_name ON product_master_data(product_name);
CREATE INDEX IF NOT EXISTS idx_mdl_slug ON product_master_data(slug);
CREATE INDEX IF NOT EXISTS idx_mdl_category ON product_master_data(category);
CREATE INDEX IF NOT EXISTS idx_mdl_keywords ON product_master_data USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_mdl_price_history_product ON mdl_price_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_product_preferences(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mdl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_product_master_data_updated_at
  BEFORE UPDATE ON product_master_data
  FOR EACH ROW
  EXECUTE FUNCTION update_mdl_updated_at();

CREATE TRIGGER update_user_product_preferences_updated_at
  BEFORE UPDATE ON user_product_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_mdl_updated_at();

-- Sample data (will be populated by import script)
COMMENT ON TABLE product_master_data IS 'Master database of all known products with pricing, icons, and metadata';
COMMENT ON TABLE mdl_price_history IS 'Historical price data for products across different stores';
COMMENT ON TABLE user_product_preferences IS 'User-specific overrides for product defaults';
