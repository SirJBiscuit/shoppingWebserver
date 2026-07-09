-- Add package count fields to shopping_list_items table

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_list_items' 
        AND column_name = 'package_count'
    ) THEN
        ALTER TABLE shopping_list_items ADD COLUMN package_count INTEGER;
        RAISE NOTICE 'Added package_count column to shopping_list_items';
    ELSE
        RAISE NOTICE 'package_count column already exists in shopping_list_items';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_list_items' 
        AND column_name = 'count_per_package'
    ) THEN
        ALTER TABLE shopping_list_items ADD COLUMN count_per_package INTEGER;
        RAISE NOTICE 'Added count_per_package column to shopping_list_items';
    ELSE
        RAISE NOTICE 'count_per_package column already exists in shopping_list_items';
    END IF;
END $$;

-- Verify the columns were created
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'shopping_list_items'
AND column_name IN ('package_count', 'count_per_package')
ORDER BY column_name;
