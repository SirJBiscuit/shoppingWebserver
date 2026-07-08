-- Add recipe tracking to shopping list items
-- This allows us to remember which recipes ingredients came from

-- Add recipe_id column to shopping_list_items
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL;

-- Add original_recipe_quantity to remember what the recipe called for
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS original_recipe_quantity DECIMAL(10, 2);

-- Add original_recipe_unit to remember recipe's unit
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS original_recipe_unit VARCHAR(50);

-- Add is_converted flag to know if we converted the quantity
ALTER TABLE shopping_list_items 
ADD COLUMN IF NOT EXISTS is_converted BOOLEAN DEFAULT false;

-- Create table to track recipe-to-shopping-list relationships
CREATE TABLE IF NOT EXISTS shopping_list_recipes (
    id SERIAL PRIMARY KEY,
    shopping_list_id INTEGER REFERENCES shopping_lists(id) ON DELETE CASCADE,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_completed BOOLEAN DEFAULT false,
    UNIQUE(shopping_list_id, recipe_id)
);

-- Create table for pantry recipe drawer (meal tracking)
CREATE TABLE IF NOT EXISTS pantry_recipe_drawer (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    pantry_item_id INTEGER REFERENCES pantry_inventory(id) ON DELETE SET NULL,
    planned_date DATE,
    status VARCHAR(50) DEFAULT 'planned', -- planned, cooking, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_recipe_id ON shopping_list_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_recipes_list_id ON shopping_list_recipes(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_pantry_recipe_drawer_user_id ON pantry_recipe_drawer(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_recipe_drawer_recipe_id ON pantry_recipe_drawer(recipe_id);
