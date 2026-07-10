-- Migration: Fix store tables - ensure all columns exist

BEGIN;

-- Ensure store_locations has all required columns
DO $$ 
BEGIN
    -- Add chain column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' AND column_name = 'chain'
    ) THEN
        ALTER TABLE store_locations ADD COLUMN chain VARCHAR(100);
    END IF;

    -- Add created_by column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE store_locations ADD COLUMN created_by INTEGER REFERENCES users(id);
    END IF;

    -- Add created_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE store_locations ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create store_aisles table if it doesn't exist
CREATE TABLE IF NOT EXISTS store_aisles (
    id SERIAL PRIMARY KEY,
    store_location_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
    aisle_number VARCHAR(10) NOT NULL,
    aisle_name VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_location_id, aisle_number)
);

-- Create aisle_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS aisle_categories (
    id SERIAL PRIMARY KEY,
    store_aisle_id INTEGER REFERENCES store_aisles(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_aisle_id, category_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_locations_chain ON store_locations(chain);
CREATE INDEX IF NOT EXISTS idx_store_locations_created_by ON store_locations(created_by);
CREATE INDEX IF NOT EXISTS idx_store_aisles_location ON store_aisles(store_location_id);
CREATE INDEX IF NOT EXISTS idx_aisle_categories_aisle ON aisle_categories(store_aisle_id);

COMMIT;
