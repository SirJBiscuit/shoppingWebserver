-- Fix missing columns identified in logs
-- Run this on your SSH terminal

-- 1. Add is_completed column to shopping_list_recipes
ALTER TABLE shopping_list_recipes 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- 2. Check if mdl_user_preferences table exists and has correct structure
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS mdl_user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mdl_user_preferences_user_key 
ON mdl_user_preferences(user_id, preference_key);

-- 3. Add comment for clarity
COMMENT ON TABLE shopping_list_recipes IS 'Links recipes to shopping lists with completion tracking';
COMMENT ON COLUMN shopping_list_recipes.is_completed IS 'Whether all items from this recipe have been checked off';
