-- Migration: Add store aisle management tables
-- This allows users to define and customize store layouts

BEGIN;

-- Store locations table
CREATE TABLE IF NOT EXISTS store_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    chain VARCHAR(100), -- e.g., "Kroger", "Walmart"
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, city, state)
);

-- Store aisles table
CREATE TABLE IF NOT EXISTS store_aisles (
    id SERIAL PRIMARY KEY,
    store_location_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
    aisle_number VARCHAR(10) NOT NULL,
    aisle_name VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_location_id, aisle_number)
);

-- Aisle category mappings
CREATE TABLE IF NOT EXISTS aisle_categories (
    id SERIAL PRIMARY KEY,
    store_aisle_id INTEGER REFERENCES store_aisles(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_aisle_id, category_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_locations_chain ON store_locations(chain);
CREATE INDEX IF NOT EXISTS idx_store_aisles_location ON store_aisles(store_location_id);
CREATE INDEX IF NOT EXISTS idx_aisle_categories_aisle ON aisle_categories(store_aisle_id);

COMMIT;
