-- ============================================================================
-- 093: Teach-a-Recipe enhancements
--
-- 1. recipes.temperature         — free-form oven/cook temp ("350°F", "Gas 4")
-- 2. recipe_ingredients.quantity_display — the quantity exactly as the user
--    typed it ("1/2", "1 1/2", "0.5", "2-3") so the recipe card shows their
--    preferred format instead of the parsed decimal.
-- ============================================================================

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS temperature VARCHAR(50);

ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS quantity_display VARCHAR(40);

COMMENT ON COLUMN recipes.temperature IS 'Free-form cooking temperature as typed, e.g. "350°F" or "Gas mark 4"';
COMMENT ON COLUMN recipe_ingredients.quantity_display IS 'Quantity exactly as entered (fraction/decimal/range); quantity column still stores parsed value';
