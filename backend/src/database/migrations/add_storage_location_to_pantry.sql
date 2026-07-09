-- Add storage_location field to pantry_items table

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pantry_items' 
        AND column_name = 'storage_location'
    ) THEN
        ALTER TABLE pantry_items ADD COLUMN storage_location VARCHAR(20) DEFAULT 'pantry';
        RAISE NOTICE 'Added storage_location column to pantry_items';
    ELSE
        RAISE NOTICE 'storage_location column already exists in pantry_items';
    END IF;
END $$;

-- Update existing items to have 'pantry' as default
UPDATE pantry_items SET storage_location = 'pantry' WHERE storage_location IS NULL;

-- Verify the column was created
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'pantry_items'
AND column_name = 'storage_location';
