-- Create recipes table for Recipe Card Slider feature
-- Phase 3: Category-Specific Features

CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'other',
  description TEXT,
  image_url TEXT,
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  servings INTEGER DEFAULT 4,
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  cuisine VARCHAR(50),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe ingredients (many-to-many with inventory items)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  inventory_item_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe instructions (ordered steps)
CREATE TABLE IF NOT EXISTS recipe_instructions (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe tags for better categorization
CREATE TABLE IF NOT EXISTS recipe_tags (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recipe_id, tag_name)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_is_favorite ON recipes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory_item_id ON recipe_ingredients(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);

-- Add some sample recipes for testing
INSERT INTO recipes (user_id, recipe_name, category, description, prep_time, cook_time, servings, difficulty, cuisine)
SELECT 
  id,
  'Spaghetti Carbonara',
  'dinner',
  'Classic Italian pasta dish with eggs, cheese, and pancetta',
  10,
  20,
  4,
  'easy',
  'Italian'
FROM users
WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO recipes (user_id, recipe_name, category, description, prep_time, cook_time, servings, difficulty, cuisine)
SELECT 
  id,
  'Chocolate Chip Cookies',
  'dessert',
  'Soft and chewy homemade chocolate chip cookies',
  15,
  12,
  24,
  'easy',
  'American'
FROM users
WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO recipes (user_id, recipe_name, category, description, prep_time, cook_time, servings, difficulty, cuisine)
SELECT 
  id,
  'Chicken Stir Fry',
  'dinner',
  'Quick and healthy stir fry with vegetables',
  15,
  15,
  4,
  'medium',
  'Asian'
FROM users
WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE recipes IS 'User recipes for the Recipe Card Slider feature';
COMMENT ON TABLE recipe_ingredients IS 'Ingredients for each recipe, optionally linked to inventory items';
COMMENT ON TABLE recipe_instructions IS 'Step-by-step cooking instructions';
COMMENT ON TABLE recipe_tags IS 'Tags for categorizing and searching recipes';
