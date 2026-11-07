-- Fix: record "new" has no field "updated_at" on UPDATE of shopping_list_items
-- The update_updated_at_column() trigger is attached to shopping_list_items
-- but the column was never added. Add it so the trigger can populate it.

ALTER TABLE shopping_list_items
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows
UPDATE shopping_list_items
SET updated_at = CURRENT_TIMESTAMP
WHERE updated_at IS NULL;

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is attached (no-op if already present)
DROP TRIGGER IF EXISTS update_shopping_list_items_updated_at ON shopping_list_items;
CREATE TRIGGER update_shopping_list_items_updated_at
    BEFORE UPDATE ON shopping_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
