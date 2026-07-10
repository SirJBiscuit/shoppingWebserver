-- Migration: Add preferred_icon column to items table
-- This allows storing user's preferred icon for each item

BEGIN;

-- Add preferred_icon column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'preferred_icon'
    ) THEN
        ALTER TABLE items ADD COLUMN preferred_icon VARCHAR(10);
        RAISE NOTICE 'Added preferred_icon column to items table';
    ELSE
        RAISE NOTICE 'preferred_icon column already exists in items table';
    END IF;
END $$;

COMMIT;
