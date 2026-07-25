-- Migration 028: Recipe Book Enhancements
-- Adds categorization, search, and inventory integration features

-- Add new columns to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_site VARCHAR(100);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_time INTEGER; -- in minutes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS calories INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2); -- 0.00 to 5.00

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_user_favorite ON recipes(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);

-- Add recipe_id to shopping_list_items for grouping
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL;
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS is_recipe_item BOOLEAN DEFAULT FALSE;

-- Create index for recipe items
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_recipe ON shopping_list_items(recipe_id) WHERE recipe_id IS NOT NULL;

-- Add inventory comparison tracking
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS inventory_match_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS is_in_inventory BOOLEAN DEFAULT FALSE;

-- Create recipe cooking history table
CREATE TABLE IF NOT EXISTS recipe_cooking_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  cooked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  servings_made INTEGER,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  deducted_from_inventory BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_recipe_history_user ON recipe_cooking_history(user_id, cooked_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_history_recipe ON recipe_cooking_history(recipe_id, cooked_at DESC);

-- Create recipe categories lookup table
CREATE TABLE IF NOT EXISTS recipe_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  icon VARCHAR(10),
  display_order INTEGER DEFAULT 0
);

-- Insert default categories
INSERT INTO recipe_categories (name, icon, display_order) VALUES
  ('Breakfast', '🍳', 1),
  ('Lunch', '🥗', 2),
  ('Dinner', '🍽️', 3),
  ('Dessert', '🍰', 4),
  ('Snack', '🍿', 5),
  ('Appetizer', '🥟', 6),
  ('Beverage', '🥤', 7),
  ('Sauce/Condiment', '🧂', 8),
  ('Soup/Stew', '🍲', 9),
  ('Salad', '🥗', 10),
  ('Side Dish', '🍚', 11),
  ('Bread/Baked Goods', '🍞', 12)
ON CONFLICT (name) DO NOTHING;

-- Create cuisines lookup table
CREATE TABLE IF NOT EXISTS recipe_cuisines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  icon VARCHAR(10),
  display_order INTEGER DEFAULT 0
);

-- Insert default cuisines
INSERT INTO recipe_cuisines (name, icon, display_order) VALUES
  ('American', '🇺🇸', 1),
  ('Italian', '🇮🇹', 2),
  ('Mexican', '🇲🇽', 3),
  ('Chinese', '🇨🇳', 4),
  ('Japanese', '🇯🇵', 5),
  ('Indian', '🇮🇳', 6),
  ('Thai', '🇹🇭', 7),
  ('French', '🇫🇷', 8),
  ('Greek', '🇬🇷', 9),
  ('Spanish', '🇪🇸', 10),
  ('Korean', '🇰🇷', 11),
  ('Vietnamese', '🇻🇳', 12),
  ('Mediterranean', '🌊', 13),
  ('Middle Eastern', '🕌', 14),
  ('Caribbean', '🏝️', 15),
  ('German', '🇩🇪', 16),
  ('British', '🇬🇧', 17),
  ('Other', '🌍', 99)
ON CONFLICT (name) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE recipe_cooking_history IS 'Tracks when users cook recipes and optionally deducts ingredients from inventory';
COMMENT ON COLUMN recipes.category IS 'Recipe category (Breakfast, Lunch, Dinner, etc.)';
COMMENT ON COLUMN recipes.cuisine IS 'Cuisine type (Italian, Mexican, Chinese, etc.)';
COMMENT ON COLUMN recipes.difficulty IS 'Difficulty level: easy, medium, hard';
COMMENT ON COLUMN recipes.tags IS 'Array of searchable tags';
COMMENT ON COLUMN recipes.source_url IS 'Original URL if imported from recipe site';
COMMENT ON COLUMN recipes.source_site IS 'Site name (Food Network, AllRecipes, etc.)';
