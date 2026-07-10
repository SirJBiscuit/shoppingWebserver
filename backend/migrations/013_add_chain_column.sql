-- Migration: Add chain column to store_locations if it doesn't exist

BEGIN;

-- Add chain column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_locations' AND column_name = 'chain'
    ) THEN
        ALTER TABLE store_locations ADD COLUMN chain VARCHAR(100);
        RAISE NOTICE 'Added chain column to store_locations table';
    ELSE
        RAISE NOTICE 'chain column already exists in store_locations table';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_store_locations_chain ON store_locations(chain);
CREATE INDEX IF NOT EXISTS idx_store_aisles_location ON store_aisles(store_location_id);
CREATE INDEX IF NOT EXISTS idx_aisle_categories_aisle ON aisle_categories(store_aisle_id);

COMMIT;
