-- Migration 011: Add Store Locations and Real-time Pricing
-- This enables GPS-based store selection and dynamic pricing

-- Create store_locations table
CREATE TABLE IF NOT EXISTS store_locations (
    id SERIAL PRIMARY KEY,
    store_chain VARCHAR(100) NOT NULL, -- 'Walmart', 'Target', 'Kroger', etc.
    store_number VARCHAR(50), -- Store identifier from chain
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    hours JSONB, -- Store hours in JSON format
    services JSONB, -- Available services (pharmacy, deli, etc.)
    api_store_id VARCHAR(100), -- Store ID for API integration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_store_locations_chain ON store_locations(store_chain);
CREATE INDEX IF NOT EXISTS idx_store_locations_coords ON store_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_store_locations_zip ON store_locations(zip_code);

-- Create user_favorite_stores table
CREATE TABLE IF NOT EXISTS user_favorite_stores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_location_id INTEGER NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    nickname VARCHAR(100), -- User's custom name for the store
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, store_location_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_stores_user ON user_favorite_stores(user_id);

-- Create store_item_prices table for real-time pricing
CREATE TABLE IF NOT EXISTS store_item_prices (
    id SERIAL PRIMARY KEY,
    store_location_id INTEGER NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    upc VARCHAR(50), -- Universal Product Code
    price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2), -- Weekly ad price
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
    source VARCHAR(50) -- 'api', 'manual', 'scraped'
);

CREATE INDEX IF NOT EXISTS idx_store_item_prices_store ON store_item_prices(store_location_id);
CREATE INDEX IF NOT EXISTS idx_store_item_prices_item ON store_item_prices(item_name);
CREATE INDEX IF NOT EXISTS idx_store_item_prices_upc ON store_item_prices(upc);
CREATE INDEX IF NOT EXISTS idx_store_item_prices_sale ON store_item_prices(on_sale, sale_end_date);

-- Add store_location_id to shopping_lists
ALTER TABLE shopping_lists 
ADD COLUMN IF NOT EXISTS store_location_id INTEGER REFERENCES store_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_lists_store_location ON shopping_lists(store_location_id);

-- Add pricing fields to shopping_list_items
ALTER TABLE shopping_list_items
ADD COLUMN IF NOT EXISTS store_price_id INTEGER REFERENCES store_item_prices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS upc VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_store_locations_updated_at ON store_locations;
CREATE TRIGGER update_store_locations_updated_at 
    BEFORE UPDATE ON store_locations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_item_prices_updated_at ON store_item_prices;
CREATE TRIGGER update_store_item_prices_updated_at 
    BEFORE UPDATE ON store_item_prices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample store locations (you can customize these)
INSERT INTO store_locations (store_chain, store_number, name, address, city, state, zip_code, latitude, longitude) VALUES
('Walmart', '1234', 'Walmart Supercenter', '123 Main St', 'Anytown', 'CA', '12345', 34.0522, -118.2437),
('Target', '5678', 'Target Store', '456 Oak Ave', 'Somewhere', 'NY', '67890', 40.7128, -74.0060),
('Kroger', '9012', 'Kroger Marketplace', '789 Elm St', 'Elsewhere', 'TX', '54321', 29.7604, -95.3698),
('Aldi', '3456', 'Aldi', '321 Pine St', 'Somewhere Else', 'FL', '98765', 25.7617, -80.1918)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE store_locations IS 'Physical store locations with GPS coordinates';
COMMENT ON TABLE user_favorite_stores IS 'User-saved favorite store locations';
COMMENT ON TABLE store_item_prices IS 'Real-time item prices from store APIs and weekly ads';
