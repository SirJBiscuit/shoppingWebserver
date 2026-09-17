-- Fix shopping_lists table to have updated_at column
-- This fixes the error: record "new" has no field "updated_at"

-- Add updated_at column if it doesn't exist
ALTER TABLE shopping_lists 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add store_name column if it doesn't exist (for store location feature)
ALTER TABLE shopping_lists 
ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);

-- Drop any existing trigger that might be causing issues
DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON shopping_lists;

-- Create the trigger to auto-update updated_at
CREATE TRIGGER update_shopping_lists_updated_at
    BEFORE UPDATE ON shopping_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing rows to have updated_at = created_at
UPDATE shopping_lists 
SET updated_at = created_at 
WHERE updated_at IS NULL;
