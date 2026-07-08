-- Add notes column to shopping_list_items
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add item_icon column if it doesn't exist (for icon persistence)
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS item_icon VARCHAR(10);

-- Add item_icon to items table for learned icons
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS item_icon VARCHAR(10);
