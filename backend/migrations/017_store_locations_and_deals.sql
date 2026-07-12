-- Migration: Store Locations and Deals System
-- Adds GPS coordinates, store deals, and digital coupons

-- Add location columns to store_locations if they don't exist
ALTER TABLE store_locations 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(50),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS hours TEXT,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Store deals table
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

-- Digital coupons table
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

-- User clipped coupons (digital wallet)
CREATE TABLE IF NOT EXISTS user_coupons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    coupon_id INTEGER REFERENCES digital_coupons(id) ON DELETE CASCADE,
    clipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    list_id INTEGER REFERENCES shopping_lists(id) ON DELETE SET NULL,
    UNIQUE(user_id, coupon_id)
);

-- Store weekly ads/flyers
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_locations_coords ON store_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_store_locations_city ON store_locations(city);
CREATE INDEX IF NOT EXISTS idx_store_locations_chain ON store_locations(chain);
CREATE INDEX IF NOT EXISTS idx_store_deals_store ON store_deals(store_id);
CREATE INDEX IF NOT EXISTS idx_store_deals_valid ON store_deals(valid_until);
CREATE INDEX IF NOT EXISTS idx_store_deals_category ON store_deals(category);
CREATE INDEX IF NOT EXISTS idx_digital_coupons_store ON digital_coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_digital_coupons_valid ON digital_coupons(valid_until);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_store_flyers_store ON store_flyers(store_id);
CREATE INDEX IF NOT EXISTS idx_store_flyers_dates ON store_flyers(week_start, week_end);

-- Insert sample store locations (major chains)
INSERT INTO store_locations (name, chain, address, city, state, zip_code, latitude, longitude, verified) VALUES
('Kroger - Ashland', 'Kroger', '500 Winchester Ave', 'Ashland', 'KY', '41101', 38.4784, -82.6379, true),
('Kroger - Lexington', 'Kroger', '2143 Versailles Rd', 'Lexington', 'KY', '40504', 38.0406, -84.5037, true),
('Walmart Supercenter - Ashland', 'Walmart', '12504 US Route 60', 'Ashland', 'KY', '41102', 38.4542, -82.7123, true),
('Target - Lexington', 'Target', '2433 Nicholasville Rd', 'Lexington', 'KY', '40503', 38.0089, -84.4966, true),
('Aldi - Ashland', 'Aldi', '3140 13th St', 'Ashland', 'KY', '41102', 38.4698, -82.6892, true)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE store_deals IS 'Weekly deals and promotions at specific stores';
COMMENT ON TABLE digital_coupons IS 'Digital coupons available for clipping';
COMMENT ON TABLE user_coupons IS 'Coupons clipped by users to their digital wallet';
COMMENT ON TABLE store_flyers IS 'Weekly ad flyers and promotional materials';
