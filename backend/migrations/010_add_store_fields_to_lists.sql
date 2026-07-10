-- Migration: Add store-specific fields to shopping lists
-- This enables per-store shopping lists with price matching

BEGIN;

-- Add store fields to shopping_lists table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_lists' AND column_name = 'store_name'
    ) THEN
        ALTER TABLE shopping_lists ADD COLUMN store_name VARCHAR(100);
        RAISE NOTICE 'Added store_name column to shopping_lists table';
    ELSE
        RAISE NOTICE 'store_name column already exists in shopping_lists table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_lists' AND column_name = 'list_type'
    ) THEN
        ALTER TABLE shopping_lists ADD COLUMN list_type VARCHAR(50) DEFAULT 'general';
        RAISE NOTICE 'Added list_type column to shopping_lists table';
    ELSE
        RAISE NOTICE 'list_type column already exists in shopping_lists table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_lists' AND column_name = 'notes'
    ) THEN
        ALTER TABLE shopping_lists ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to shopping_lists table';
    ELSE
        RAISE NOTICE 'notes column already exists in shopping_lists table';
    END IF;
END $$;

-- Add aisle information to shopping_list_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_list_items' AND column_name = 'aisle_number'
    ) THEN
        ALTER TABLE shopping_list_items ADD COLUMN aisle_number VARCHAR(10);
        RAISE NOTICE 'Added aisle_number column to shopping_list_items table';
    ELSE
        RAISE NOTICE 'aisle_number column already exists in shopping_list_items table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopping_list_items' AND column_name = 'aisle_name'
    ) THEN
        ALTER TABLE shopping_list_items ADD COLUMN aisle_name VARCHAR(100);
        RAISE NOTICE 'Added aisle_name column to shopping_list_items table';
    ELSE
        RAISE NOTICE 'aisle_name column already exists in shopping_list_items table';
    END IF;
END $$;

-- Create index for store-based queries
CREATE INDEX IF NOT EXISTS idx_shopping_lists_store ON shopping_lists(store_name);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_aisle ON shopping_list_items(aisle_number);

COMMIT;
