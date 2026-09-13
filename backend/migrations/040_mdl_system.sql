-- MDL (Machine Data Learning) System Migration
-- Comprehensive system for tracking items, user patterns, locations, and aisles

-- ============================================================================
-- PART 1: Item Name Registry (Always Keep All Names)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mdl_item_names (
  id SERIAL PRIMARY KEY,
  normalized_name VARCHAR(255) UNIQUE NOT NULL,
  original_variations JSONB DEFAULT '[]'::jsonb, -- All variations seen
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_uses BIGINT DEFAULT 0,
  user_count INTEGER DEFAULT 0, -- How many users used it
  is_trained BOOLEAN DEFAULT false,
  category_confidence DECIMAL(3,2), -- 0.00 to 1.00
  predicted_category VARCHAR(100),
  predicted_icon VARCHAR(10),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mdl_item_names_normalized ON mdl_item_names(normalized_name);
CREATE INDEX IF NOT EXISTS idx_mdl_item_names_trained ON mdl_item_names(is_trained);
CREATE INDEX IF NOT EXISTS idx_mdl_item_names_category ON mdl_item_names(predicted_category);

-- ============================================================================
-- PART 2: User Item History (Hot Data - Active Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mdl_user_item_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  
  -- When & Where
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  hour_of_day INTEGER, -- 0-23
  week_of_month INTEGER, -- 1-5
  month INTEGER, -- 1-12
  season VARCHAR(10), -- spring, summer, fall, winter
  
  -- What & How Much
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  price DECIMAL(10,2),
  store_name VARCHAR(255),
  list_id INTEGER,
  
  -- Location Context
  user_state VARCHAR(2),
  user_city VARCHAR(100),
  
  -- Context
  was_suggestion BOOLEAN DEFAULT false,
  user_typed BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_mdl_history_user_item ON mdl_user_item_history(user_id, item_name_id);
CREATE INDEX IF NOT EXISTS idx_mdl_history_timestamp ON mdl_user_item_history(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_mdl_history_day_hour ON mdl_user_item_history(day_of_week, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_mdl_history_state ON mdl_user_item_history(user_state);

-- ============================================================================
-- PART 3: User Pattern Summary (Aggregated Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mdl_user_patterns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  
  -- Frequency Stats
  total_times_added INTEGER DEFAULT 0,
  first_added TIMESTAMP,
  last_added TIMESTAMP,
  average_days_between DECIMAL(10,2),
  
  -- Price Stats
  average_price DECIMAL(10,2),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  last_price DECIMAL(10,2),
  price_trend VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
  
  -- Quantity Stats
  average_quantity DECIMAL(10,2),
  typical_unit VARCHAR(50),
  
  -- Temporal Patterns
  preferred_day_of_week INTEGER,
  preferred_time_of_day INTEGER,
  seasonal_pattern JSONB DEFAULT '{}'::jsonb,
  monthly_pattern JSONB DEFAULT '{}'::jsonb,
  
  -- Store Preferences
  preferred_stores JSONB DEFAULT '{}'::jsonb,
  
  -- Prediction Data
  next_predicted_date DATE,
  prediction_confidence DECIMAL(3,2),
  
  -- Metadata
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, item_name_id)
);

CREATE INDEX IF NOT EXISTS idx_mdl_patterns_user ON mdl_user_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_mdl_patterns_prediction ON mdl_user_patterns(next_predicted_date);
CREATE INDEX IF NOT EXISTS idx_mdl_patterns_confidence ON mdl_user_patterns(prediction_confidence);

-- ============================================================================
-- PART 4: Location-Aware Price Data
-- ============================================================================

CREATE TABLE IF NOT EXISTS mdl_location_prices (
  id SERIAL PRIMARY KEY,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  
  -- Location Specificity
  country VARCHAR(2) DEFAULT 'US',
  state VARCHAR(2),
  metro_area VARCHAR(100),
  store_chain VARCHAR(100),
  specific_store_id INTEGER,
  
  -- Price Stats
  average_price DECIMAL(10,2),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  sample_size INTEGER DEFAULT 0,
  
  -- Temporal
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Confidence
  confidence_score DECIMAL(3,2),
  
  UNIQUE(item_name_id, COALESCE(state, ''), COALESCE(store_chain, ''), COALESCE(specific_store_id, 0))
);

CREATE INDEX IF NOT EXISTS idx_mdl_prices_item_state ON mdl_location_prices(item_name_id, state);
CREATE INDEX IF NOT EXISTS idx_mdl_prices_chain_state ON mdl_location_prices(item_name_id, store_chain, state);
CREATE INDEX IF NOT EXISTS idx_mdl_prices_store ON mdl_location_prices(specific_store_id);

-- ============================================================================
-- PART 5: User Locations
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE ON DELETE CASCADE,
  
  -- Location Data
  country VARCHAR(2) DEFAULT 'US',
  state VARCHAR(2),
  zip_code VARCHAR(10),
  city VARCHAR(100),
  metro_area VARCHAR(100),
  
  -- Privacy Settings
  location_sharing_level VARCHAR(20) DEFAULT 'state', -- 'none', 'state', 'city', 'exact'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_locations_state ON user_locations(state);
CREATE INDEX IF NOT EXISTS idx_user_locations_metro ON user_locations(metro_area);

-- ============================================================================
-- PART 6: Store Locations
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_locations (
  id SERIAL PRIMARY KEY,
  
  -- Store Identity
  chain_name VARCHAR(100),
  store_number VARCHAR(50),
  store_name VARCHAR(255),
  
  -- Location
  country VARCHAR(2) DEFAULT 'US',
  state VARCHAR(2),
  city VARCHAR(100),
  zip_code VARCHAR(10),
  address TEXT,
  metro_area VARCHAR(100),
  
  -- Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(chain_name, store_number)
);

CREATE INDEX IF NOT EXISTS idx_store_locations_chain_state ON store_locations(chain_name, state);
CREATE INDEX IF NOT EXISTS idx_store_locations_coords ON store_locations(latitude, longitude);

-- ============================================================================
-- PART 7: Aisle Training System
-- ============================================================================

-- Aisle Reports (User submissions)
CREATE TABLE IF NOT EXISTS mdl_aisle_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  store_id INTEGER REFERENCES store_locations(id),
  aisle_number VARCHAR(20),
  was_prediction_correct BOOLEAN,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aisle_reports_item_store ON mdl_aisle_reports(item_name_id, store_id);
CREATE INDEX IF NOT EXISTS idx_aisle_reports_user ON mdl_aisle_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_aisle_reports_timestamp ON mdl_aisle_reports(reported_at DESC);

-- Location-Aware Aisles (Aggregated)
CREATE TABLE IF NOT EXISTS mdl_location_aisles (
  id SERIAL PRIMARY KEY,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  category VARCHAR(100),
  
  -- Location
  store_chain VARCHAR(100),
  state VARCHAR(2),
  specific_store_id INTEGER REFERENCES store_locations(id),
  
  -- Aisle Info
  aisle_number VARCHAR(20),
  aisle_name VARCHAR(100),
  section VARCHAR(100),
  
  -- Stats
  confidence_score DECIMAL(3,2),
  report_count INTEGER DEFAULT 0,
  
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(item_name_id, COALESCE(specific_store_id, 0))
);

CREATE INDEX IF NOT EXISTS idx_location_aisles_item_chain_state ON mdl_location_aisles(item_name_id, store_chain, state);
CREATE INDEX IF NOT EXISTS idx_location_aisles_store ON mdl_location_aisles(specific_store_id);

-- Category-Aisle Mapping
CREATE TABLE IF NOT EXISTS mdl_category_aisles (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),
  store_id INTEGER REFERENCES store_locations(id),
  aisle_number VARCHAR(20),
  item_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(category, store_id, aisle_number)
);

CREATE INDEX IF NOT EXISTS idx_category_aisles_category_store ON mdl_category_aisles(category, store_id);

-- User Store Layouts (Custom configurations)
CREATE TABLE IF NOT EXISTS user_store_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES store_locations(id),
  layout_data JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_user_layouts_user ON user_store_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_layouts_store ON user_store_layouts(store_id);
CREATE INDEX IF NOT EXISTS idx_user_layouts_public ON user_store_layouts(is_public) WHERE is_public = true;

-- ============================================================================
-- PART 8: Training Queue
-- ============================================================================

CREATE TABLE IF NOT EXISTS mdl_training_queue (
  id SERIAL PRIMARY KEY,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  priority INTEGER DEFAULT 0,
  reason VARCHAR(100), -- 'high_frequency', 'new_variation', 'user_request'
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'in_progress', 'completed'
);

CREATE INDEX IF NOT EXISTS idx_training_queue_status ON mdl_training_queue(status);
CREATE INDEX IF NOT EXISTS idx_training_queue_priority ON mdl_training_queue(priority DESC);

-- ============================================================================
-- PART 9: Helper Functions
-- ============================================================================

-- Function to normalize item names
CREATE OR REPLACE FUNCTION normalize_item_name(item_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(item_name, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get or create item name
CREATE OR REPLACE FUNCTION get_or_create_item_name(item_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  normalized TEXT;
  item_id INTEGER;
BEGIN
  normalized := normalize_item_name(item_name);
  
  -- Try to find existing
  SELECT id INTO item_id
  FROM mdl_item_names
  WHERE normalized_name = normalized;
  
  -- Create if not exists
  IF item_id IS NULL THEN
    INSERT INTO mdl_item_names (normalized_name, original_variations)
    VALUES (normalized, jsonb_build_array(item_name))
    RETURNING id INTO item_id;
  ELSE
    -- Update variations if new
    UPDATE mdl_item_names
    SET original_variations = original_variations || jsonb_build_array(item_name),
        last_seen = CURRENT_TIMESTAMP,
        total_uses = total_uses + 1
    WHERE id = item_id
      AND NOT original_variations @> jsonb_build_array(item_name);
  END IF;
  
  RETURN item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate season
CREATE OR REPLACE FUNCTION get_season(date_val DATE)
RETURNS VARCHAR(10) AS $$
DECLARE
  month_num INTEGER;
BEGIN
  month_num := EXTRACT(MONTH FROM date_val);
  
  CASE
    WHEN month_num IN (3, 4, 5) THEN RETURN 'spring';
    WHEN month_num IN (6, 7, 8) THEN RETURN 'summer';
    WHEN month_num IN (9, 10, 11) THEN RETURN 'fall';
    ELSE RETURN 'winter';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PART 10: Update Triggers
-- ============================================================================

-- Trigger to update user_locations timestamp
CREATE OR REPLACE FUNCTION update_user_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_locations_update_timestamp ON user_locations;
CREATE TRIGGER user_locations_update_timestamp
  BEFORE UPDATE ON user_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_location_timestamp();

-- Trigger to update mdl_user_patterns timestamp
CREATE OR REPLACE FUNCTION update_mdl_patterns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mdl_patterns_update_timestamp ON mdl_user_patterns;
CREATE TRIGGER mdl_patterns_update_timestamp
  BEFORE UPDATE ON mdl_user_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_mdl_patterns_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE mdl_item_names IS 'Permanent registry of all item names ever seen';
COMMENT ON TABLE mdl_user_item_history IS 'Detailed history of every item addition by users';
COMMENT ON TABLE mdl_user_patterns IS 'Aggregated patterns and predictions per user per item';
COMMENT ON TABLE mdl_location_prices IS 'Location-aware price data for accurate estimates';
COMMENT ON TABLE user_locations IS 'User location data for personalized predictions';
COMMENT ON TABLE store_locations IS 'Physical store locations and details';
COMMENT ON TABLE mdl_aisle_reports IS 'User-reported aisle locations for items';
COMMENT ON TABLE mdl_location_aisles IS 'Aggregated aisle predictions per location';
COMMENT ON TABLE mdl_category_aisles IS 'Category-to-aisle mappings per store';
COMMENT ON TABLE user_store_layouts IS 'User-customized store layouts';
COMMENT ON TABLE mdl_training_queue IS 'Items that need admin/user training';

-- ============================================================================
-- DONE
-- ============================================================================
