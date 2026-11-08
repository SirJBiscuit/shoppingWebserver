-- Migration 049: Store System Unification
-- Reconciles the three divergent store_locations schemas (011/012/040) and
-- creates the store-support tables stores.js + mdl.js expect.
--
-- Canonical columns:
--   name, chain, user_id, is_public
-- Legacy columns (store_name/chain_name/store_chain/created_by) are kept but
-- backfilled into the canonical ones so all routes can share one table.

-- ============================================================================
-- 1. STORE LOCATIONS — canonical column set
-- ============================================================================
-- If the table doesn't exist yet (e.g. migration 040 aborted), create it
CREATE TABLE IF NOT EXISTS store_locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  chain VARCHAR(100),
  store_name VARCHAR(255),
  chain_name VARCHAR(100),
  store_chain VARCHAR(100),
  store_number VARCHAR(50),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  country VARCHAR(50) DEFAULT 'US',
  state VARCHAR(50),
  city VARCHAR(100),
  zip_code VARCHAR(20),
  area_code VARCHAR(10),
  metro_area VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS chain VARCHAR(100);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS chain_name VARCHAR(100);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS store_chain VARCHAR(100);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS store_number VARCHAR(50);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'US';
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS area_code VARCHAR(10);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS metro_area VARCHAR(100);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE store_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill canonical columns from whichever legacy columns are populated
UPDATE store_locations SET
  name       = COALESCE(name, store_name),
  store_name = COALESCE(store_name, name),
  chain      = COALESCE(chain, chain_name, store_chain),
  chain_name = COALESCE(chain_name, chain, store_chain),
  user_id    = COALESCE(user_id, created_by),
  created_by = COALESCE(created_by, user_id)
WHERE name IS NULL OR store_name IS NULL OR chain IS NULL
   OR chain_name IS NULL OR user_id IS NULL OR created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_store_locations_user ON store_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_public ON store_locations(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_store_locations_chain_state ON store_locations(chain, state);
CREATE INDEX IF NOT EXISTS idx_store_locations_area_code ON store_locations(area_code);
CREATE INDEX IF NOT EXISTS idx_store_locations_region ON store_locations(state, area_code);
CREATE INDEX IF NOT EXISTS idx_store_locations_coords ON store_locations(latitude, longitude);

-- ============================================================================
-- 2. USER FAVORITE STORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_favorite_stores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_location_id INTEGER NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    nickname VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, store_location_id)
);
CREATE INDEX IF NOT EXISTS idx_user_favorite_stores_user ON user_favorite_stores(user_id);

-- ============================================================================
-- 3. STORE ITEM PRICES (per-store, per-location pricing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_item_prices (
    id SERIAL PRIMARY KEY,
    store_location_id INTEGER NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    upc VARCHAR(50),
    price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2),
    unit VARCHAR(50),
    size VARCHAR(100),
    brand VARCHAR(100),
    on_sale BOOLEAN DEFAULT FALSE,
    sale_start_date DATE,
    sale_end_date DATE,
    aisle_number VARCHAR(20),
    aisle_name VARCHAR(100),
    in_stock BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) -- 'api', 'manual', 'learned'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_store_item_prices
    ON store_item_prices(store_location_id, item_name);
CREATE INDEX IF NOT EXISTS idx_store_item_prices_store ON store_item_prices(store_location_id);
CREATE INDEX IF NOT EXISTS idx_store_item_prices_item ON store_item_prices(item_name);
CREATE INDEX IF NOT EXISTS idx_store_item_prices_upc ON store_item_prices(upc);
CREATE INDEX IF NOT EXISTS idx_store_item_prices_sale ON store_item_prices(on_sale, sale_end_date);

-- ============================================================================
-- 4. STORE AISLES + CATEGORY MAPPING
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_aisles (
    id SERIAL PRIMARY KEY,
    store_location_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
    aisle_number VARCHAR(10) NOT NULL,
    aisle_name VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_location_id, aisle_number)
);
CREATE INDEX IF NOT EXISTS idx_store_aisles_location ON store_aisles(store_location_id);

CREATE TABLE IF NOT EXISTS aisle_categories (
    id SERIAL PRIMARY KEY,
    store_aisle_id INTEGER REFERENCES store_aisles(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_aisle_id, category_name)
);
CREATE INDEX IF NOT EXISTS idx_aisle_categories_aisle ON aisle_categories(store_aisle_id);

-- ============================================================================
-- 5. SHOPPING LIST LINKS (store + sale pricing on items)
-- ============================================================================
ALTER TABLE shopping_lists
  ADD COLUMN IF NOT EXISTS store_location_id INTEGER REFERENCES store_locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_shopping_lists_store_location ON shopping_lists(store_location_id);

ALTER TABLE shopping_list_items
  ADD COLUMN IF NOT EXISTS store_price_id INTEGER REFERENCES store_item_prices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upc VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);

-- ============================================================================
-- 6. updated_at trigger for store_locations
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_store_locations_updated_at ON store_locations;
CREATE TRIGGER update_store_locations_updated_at
    BEFORE UPDATE ON store_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_favorite_stores IS 'User-saved favorite store locations';
COMMENT ON TABLE store_item_prices IS 'Per-store, per-location item pricing';
COMMENT ON TABLE store_aisles IS 'Store-specific aisle layout';
COMMENT ON TABLE aisle_categories IS 'Category-to-aisle mapping per store';

-- ============================================================================
-- 7. STORE DEALS + DIGITAL COUPONS (from migration 017, not in the runner)
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_deals (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    original_price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2) NOT NULL,
    savings DECIMAL(10, 2),
    unit VARCHAR(50),
    deal_type VARCHAR(50), -- 'weekly', 'flash', 'clearance', 'bogo'
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_store_deals_store ON store_deals(store_id);
CREATE INDEX IF NOT EXISTS idx_store_deals_valid ON store_deals(valid_until);
CREATE INDEX IF NOT EXISTS idx_store_deals_category ON store_deals(category);

CREATE TABLE IF NOT EXISTS digital_coupons (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
    coupon_code VARCHAR(50),
    item_name VARCHAR(255),
    category VARCHAR(100),
    discount_amount DECIMAL(10, 2),
    discount_percent INTEGER,
    min_purchase DECIMAL(10, 2),
    max_discount DECIMAL(10, 2),
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NOT NULL,
    usage_limit INTEGER,
    description TEXT,
    terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_digital_coupons_store ON digital_coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_digital_coupons_valid ON digital_coupons(valid_until);

CREATE TABLE IF NOT EXISTS user_coupons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    coupon_id INTEGER REFERENCES digital_coupons(id) ON DELETE CASCADE,
    clipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    list_id INTEGER REFERENCES shopping_lists(id) ON DELETE SET NULL,
    UNIQUE(user_id, coupon_id)
);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);

CREATE TABLE IF NOT EXISTS store_flyers (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    flyer_url TEXT,
    pdf_url TEXT,
    scraped_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_store_flyers_store ON store_flyers(store_id);
CREATE INDEX IF NOT EXISTS idx_store_flyers_dates ON store_flyers(week_start, week_end);

COMMENT ON TABLE store_deals IS 'Weekly deals and promotions at specific stores';
COMMENT ON TABLE digital_coupons IS 'Digital coupons available for clipping';
COMMENT ON TABLE user_coupons IS 'Coupons clipped by users to their digital wallet';
COMMENT ON TABLE store_flyers IS 'Weekly ad flyers and promotional materials';
