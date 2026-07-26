-- Migration 032: Simplified Recipe System - Pantry Staples
-- Makes recipe ingredient checking practical and user-friendly

-- Add pantry staple flag to recipe ingredients
ALTER TABLE recipe_ingredients 
ADD COLUMN IF NOT EXISTS is_pantry_staple BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS substitutions TEXT;

-- Update is_optional if it doesn't exist
ALTER TABLE recipe_ingredients 
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE;

-- Create index for pantry staple lookups
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_pantry_staple 
ON recipe_ingredients(is_pantry_staple);

-- Common pantry staples list (for auto-detection)
CREATE TABLE IF NOT EXISTS common_pantry_staples (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common pantry staples
INSERT INTO common_pantry_staples (item_name, category) VALUES
-- Baking
('Flour', 'Baking'),
('Sugar', 'Baking'),
('Brown Sugar', 'Baking'),
('Baking Powder', 'Baking'),
('Baking Soda', 'Baking'),
('Vanilla Extract', 'Baking'),
('Yeast', 'Baking'),

-- Oils & Fats
('Vegetable Oil', 'Oils'),
('Olive Oil', 'Oils'),
('Canola Oil', 'Oils'),
('Butter', 'Dairy'),
('Margarine', 'Dairy'),

-- Seasonings
('Salt', 'Seasonings'),
('Black Pepper', 'Seasonings'),
('Garlic Powder', 'Seasonings'),
('Onion Powder', 'Seasonings'),
('Paprika', 'Seasonings'),
('Chili Powder', 'Seasonings'),
('Cumin', 'Seasonings'),
('Oregano', 'Seasonings'),
('Basil', 'Seasonings'),
('Thyme', 'Seasonings'),
('Rosemary', 'Seasonings'),
('Cinnamon', 'Seasonings'),
('Nutmeg', 'Seasonings'),

-- Condiments
('Soy Sauce', 'Condiments'),
('Worcestershire Sauce', 'Condiments'),
('Hot Sauce', 'Condiments'),
('Ketchup', 'Condiments'),
('Mustard', 'Condiments'),
('Mayonnaise', 'Condiments'),
('Vinegar', 'Condiments'),
('Apple Cider Vinegar', 'Condiments'),

-- Pantry Staples
('Rice', 'Grains'),
('Pasta', 'Grains'),
('Bread', 'Grains'),
('Oats', 'Grains'),
('Cornstarch', 'Baking'),
('Honey', 'Sweeteners'),
('Maple Syrup', 'Sweeteners'),

-- Canned Goods
('Chicken Broth', 'Broth'),
('Beef Broth', 'Broth'),
('Vegetable Broth', 'Broth'),
('Tomato Paste', 'Canned'),
('Tomato Sauce', 'Canned')
ON CONFLICT (item_name) DO NOTHING;

-- Add function to auto-detect pantry staples
CREATE OR REPLACE FUNCTION is_common_pantry_staple(ingredient_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM common_pantry_staples 
    WHERE LOWER(item_name) = LOWER(ingredient_name)
  );
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN recipe_ingredients.is_pantry_staple IS 'If true, assume user always has this ingredient (flour, salt, etc.)';
COMMENT ON COLUMN recipe_ingredients.substitutions IS 'Suggested substitutions for this ingredient';
COMMENT ON TABLE common_pantry_staples IS 'List of common pantry staples that most people always have';
