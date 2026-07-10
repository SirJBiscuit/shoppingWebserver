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

-- Create index for chain column
CREATE INDEX IF NOT EXISTS idx_store_locations_chain ON store_locations(chain);

COMMIT;
