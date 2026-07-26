-- Migration 033: Practical Seasoning System
-- Adds seasoning tracking, fill levels, and Spice Rack location

-- Add seasoning fields to inventory
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS is_seasoning BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fill_level VARCHAR(20) DEFAULT 'full'; -- 'full', 'half', 'low', 'empty'

-- Create common seasonings table
CREATE TABLE IF NOT EXISTS common_seasonings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100), -- 'basic', 'spice', 'herb', 'blend'
  common_size VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common seasonings
INSERT INTO common_seasonings (name, category, common_size) VALUES
-- Basic
('Salt', 'basic', '26 oz'),
('Black Pepper', 'basic', '2 oz'),
('Sea Salt', 'basic', '16 oz'),
('Kosher Salt', 'basic', '3 lb'),

-- Spices
('Garlic Powder', 'spice', '3 oz'),
('Onion Powder', 'spice', '2.5 oz'),
('Paprika', 'spice', '2 oz'),
('Smoked Paprika', 'spice', '2 oz'),
('Chili Powder', 'spice', '2.5 oz'),
('Cumin', 'spice', '2 oz'),
('Ground Cumin', 'spice', '2 oz'),
('Coriander', 'spice', '1.5 oz'),
('Turmeric', 'spice', '2 oz'),
('Ginger Powder', 'spice', '1.5 oz'),
('Cinnamon', 'spice', '2.5 oz'),
('Nutmeg', 'spice', '1.5 oz'),
('Cayenne Pepper', 'spice', '1.5 oz'),
('Red Pepper Flakes', 'spice', '1.5 oz'),
('White Pepper', 'spice', '2 oz'),
('Allspice', 'spice', '1.5 oz'),
('Cloves', 'spice', '1 oz'),
('Cardamom', 'spice', '1.5 oz'),
('Mustard Powder', 'spice', '1.5 oz'),

-- Herbs
('Oregano', 'herb', '1 oz'),
('Basil', 'herb', '1 oz'),
('Thyme', 'herb', '0.75 oz'),
('Rosemary', 'herb', '1 oz'),
('Parsley', 'herb', '0.5 oz'),
('Dill', 'herb', '0.75 oz'),
('Sage', 'herb', '0.75 oz'),
('Marjoram', 'herb', '0.5 oz'),
('Bay Leaves', 'herb', '0.5 oz'),
('Mint', 'herb', '0.5 oz'),

-- Blends
('Italian Seasoning', 'blend', '1 oz'),
('Taco Seasoning', 'blend', '1 oz'),
('Everything Bagel Seasoning', 'blend', '2.5 oz'),
('Cajun Seasoning', 'blend', '2 oz'),
('Lemon Pepper', 'blend', '2 oz'),
('Garlic Salt', 'blend', '3 oz'),
('Onion Salt', 'blend', '2.5 oz'),
('Seasoned Salt', 'blend', '3 oz'),
('Poultry Seasoning', 'blend', '1 oz'),
('Pumpkin Pie Spice', 'blend', '1.5 oz'),
('Apple Pie Spice', 'blend', '1.5 oz'),
('Chinese Five Spice', 'blend', '1.5 oz'),
('Curry Powder', 'blend', '2 oz'),
('Garam Masala', 'blend', '2 oz'),
('Ranch Seasoning', 'blend', '1 oz'),
('BBQ Seasoning', 'blend', '2 oz')
ON CONFLICT (name) DO NOTHING;

-- Function to check if item is a common seasoning
CREATE OR REPLACE FUNCTION is_common_seasoning(ingredient_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM common_seasonings 
    WHERE LOWER(name) = LOWER(ingredient_name)
  );
END;
$$ LANGUAGE plpgsql;

-- Add recipe_note column to shopping_list_items for recipe tracking
ALTER TABLE shopping_list_items
ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recipe_note TEXT;

-- Create index for recipe tracking
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_recipe 
ON shopping_list_items(recipe_id);

-- Comments
COMMENT ON COLUMN inventory.is_seasoning IS 'True if this is a seasoning/spice (uses fill level instead of exact quantity)';
COMMENT ON COLUMN inventory.fill_level IS 'Visual fill level for seasonings: full, half, low, empty';
COMMENT ON COLUMN shopping_list_items.recipe_id IS 'If item was added from a recipe, links to that recipe';
COMMENT ON COLUMN shopping_list_items.recipe_note IS 'Note showing which recipe this ingredient is for';
COMMENT ON TABLE common_seasonings IS 'List of common seasonings for auto-detection and spice rack management';
