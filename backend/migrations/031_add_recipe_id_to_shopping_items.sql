-- Add recipe_id to shopping_list_items for recipe grouping
-- Migration: 031_add_recipe_id_to_shopping_items.sql

-- Add recipe_id column
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_recipe_id 
ON shopping_list_items(recipe_id);

-- Add index for grouped queries
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_recipe 
ON shopping_list_items(shopping_list_id, recipe_id);

-- Add comment
COMMENT ON COLUMN shopping_list_items.recipe_id IS 'Reference to recipe if item was added from a recipe';
