-- Enhance items table for better pattern/preference storage
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS preferred_icon VARCHAR(10),
ADD COLUMN IF NOT EXISTS preferred_unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_quantity DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_purchased TIMESTAMP,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_user_name ON items(user_id, LOWER(name));

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for items table
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
