-- Add store_name column to shopping_lists table
-- This allows users to set which store they're shopping at for each list

ALTER TABLE shopping_lists 
ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);

-- Add index for faster queries by store
CREATE INDEX IF NOT EXISTS idx_shopping_lists_store 
  ON shopping_lists(store_name) 
  WHERE store_name IS NOT NULL;

-- Add comment
COMMENT ON COLUMN shopping_lists.store_name IS 'Store location where user plans to shop for this list';
