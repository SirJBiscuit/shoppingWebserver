-- ============================================================================
-- 094: Recipe Book staging flag
--
-- in_recipe_book controls whether a recipe shows up in the Recipe Book.
-- Lab creations (Smoothie/Plate/Mix lab builds, logged meals) are staged with
-- in_recipe_book = false so they live in the lab's "Can Create" shelf until
-- the user explicitly sends them to the book — nothing auto-lands in the
-- book anymore.
--
-- Existing lab-built recipes (tagged custom-builder / plate-lab) are
-- backfilled to staged so they stop cluttering the book.
-- ============================================================================

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS in_recipe_book BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill: recipes previously created by lab builders are staged, not booked
UPDATE recipes
SET in_recipe_book = FALSE
WHERE in_recipe_book = TRUE
  AND (
    tags @> ARRAY['custom-builder']::text[]
    OR tags @> ARRAY['plate-lab']::text[]
  );

CREATE INDEX IF NOT EXISTS idx_recipes_in_book
  ON recipes(user_id, in_recipe_book);

COMMENT ON COLUMN recipes.in_recipe_book IS 'false = staged lab creation, not yet sent to the Recipe Book';
