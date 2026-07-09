-- Verify and fix icon columns in shopping_list_items and items tables

-- First, check if item_icon column exists in shopping_list_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_list_items' 
        AND column_name = 'item_icon'
    ) THEN
        ALTER TABLE shopping_list_items ADD COLUMN item_icon VARCHAR(10);
        RAISE NOTICE 'Added item_icon column to shopping_list_items';
    ELSE
        RAISE NOTICE 'item_icon column already exists in shopping_list_items';
    END IF;
END $$;

-- Check if notes column exists in shopping_list_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shopping_list_items' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE shopping_list_items ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to shopping_list_items';
    ELSE
        RAISE NOTICE 'notes column already exists in shopping_list_items';
    END IF;
END $$;

-- Check if item_icon column exists in items table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'item_icon'
    ) THEN
        ALTER TABLE items ADD COLUMN item_icon VARCHAR(10);
        RAISE NOTICE 'Added item_icon column to items';
    ELSE
        RAISE NOTICE 'item_icon column already exists in items';
    END IF;
END $$;

-- Verify the columns were created
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('shopping_list_items', 'items')
AND column_name IN ('item_icon', 'notes')
ORDER BY table_name, column_name;
