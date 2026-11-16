-- Per-user taste feedback for recipes — powers the labs' "How was it?"
-- modal: star rating, taste tags (too sweet / too thin / bland...),
-- free-form notes, and how many servings were actually made.
-- The /recipes/:id/variant endpoint reads taste_tags to build an
-- "improved" recipe with adjusted ingredient amounts.

CREATE TABLE IF NOT EXISTS recipe_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  taste_tags TEXT[] DEFAULT '{}',
  note TEXT,
  servings_made NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe ON recipe_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ratings_user ON recipe_ratings(user_id);
