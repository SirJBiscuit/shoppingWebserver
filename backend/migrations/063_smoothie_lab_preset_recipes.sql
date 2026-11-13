-- ============================================================================
-- 063: Smoothie Lab preset recipes
--
-- Same convention as 061 (mix presets): public recipes with user_id NULL and
-- category 'smoothie', so Smoothie Lab reuses /recipes?category=smoothie +
-- /recipes/:id/inventory-comparison + mark-cooked — no new endpoints needed.
-- Idempotent: name+category guard on recipes, recipe_id+item_name on ingredients.
-- ============================================================================

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE recipes ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- SEED: preset smoothie recipes
-- ============================================================================

INSERT INTO recipes (user_id, name, description, servings, prep_time, cook_time, category, cuisine, instructions, is_public)
SELECT NULL::integer, v.name, v.description, v.servings, v.prep_time, 0, 'smoothie', v.cuisine, v.instructions, true
FROM (VALUES
('Berry Blast', 'Mixed berry classic — sweet, tart, and endlessly flexible.', 2, 5, 'American',
 '1. Add berries, banana, yogurt, and milk to the blender.
2. Blend 45–60 seconds until completely smooth.
3. Adjust thickness with more milk, sweetness with honey. Pour over ice if desired.'),
('Tropical Sunrise', 'Mango, pineapple, and orange — a vacation in a glass.', 2, 5, 'Tropical',
 '1. Add mango, pineapple, banana, and orange juice to the blender.
2. Blend until smooth, adding coconut water to thin.
3. Garnish with a lime wheel if you are feeling fancy.'),
('Green Machine', 'Spinach and banana base — greens you actually want to drink.', 2, 5, 'Healthy',
 '1. Add spinach and liquid to the blender first — blend 20 seconds so no leaf bits remain.
2. Add banana, apple, and lemon juice; blend until smooth.
3. Add ice and blend 10 more seconds for a frosty finish.'),
('Peanut Butter Banana', 'Thick, protein-forward, and tastes like a milkshake.', 1, 5, 'American',
 '1. Add banana, peanut butter, milk, and yogurt to the blender.
2. Blend until creamy.
3. Add oats or cinnamon and pulse to combine.'),
('Strawberry Oatmeal', 'Breakfast in a glass — oats make it stick with you.', 2, 5, 'American',
 '1. Blend oats into a fine powder first (10 seconds, dry).
2. Add strawberries, banana, milk, and honey.
3. Blend until smooth; let rest 2 minutes so oats soften.'),
('Mango Lassi', 'Creamy mango-yogurt smoothie inspired by the Indian classic.', 2, 5, 'Indian',
 '1. Add mango, yogurt, milk, and honey to the blender.
2. Add cardamom if using.
3. Blend until silky — should be pourable but thick.'),
('Chocolate Protein Shake', 'Post-workout staple — cocoa, banana, and your favorite protein.', 1, 5, 'Healthy',
 '1. Add milk first, then protein powder and cocoa (prevents powder clumping).
2. Add banana and peanut butter.
3. Blend until smooth; add ice for thickness.')
) AS v(name, description, servings, prep_time, cuisine, instructions)
WHERE NOT EXISTS (
  SELECT 1 FROM recipes r WHERE r.name = v.name AND r.is_public = true AND r.category = 'smoothie'
);

-- ============================================================================
-- SEED: ingredients for each smoothie preset
-- ============================================================================

INSERT INTO recipe_ingredients (recipe_id, item_name, quantity, unit, is_optional, is_pantry_staple, notes, sort_order)
SELECT r.id, v.item_name, v.quantity, v.unit, v.is_optional, v.is_pantry_staple, v.notes, v.sort_order
FROM recipes r
JOIN (VALUES
('Berry Blast',           'Mixed Berries',    1.5,  'cup',   false, false, 'frozen works great',       1),
('Berry Blast',           'Banana',           1,    'whole', false, false, 'ripe',                     2),
('Berry Blast',           'Greek Yogurt',     0.5,  'cup',   false, false, NULL,                       3),
('Berry Blast',           'Milk',             0.75, 'cup',   false, true,  'any kind',                 4),
('Berry Blast',           'Honey',            1,    'tbsp',  true,  true,  'to taste',                 5),
('Tropical Sunrise',      'Mango',            1,    'cup',   false, false, 'chunks, frozen ok',        1),
('Tropical Sunrise',      'Pineapple',        1,    'cup',   false, false, 'chunks, frozen ok',        2),
('Tropical Sunrise',      'Banana',           1,    'whole', false, false, NULL,                       3),
('Tropical Sunrise',      'Orange Juice',     0.75, 'cup',   false, false, NULL,                       4),
('Tropical Sunrise',      'Coconut Water',    0.5,  'cup',   true,  false, 'to thin',                  5),
('Green Machine',         'Spinach',          2,    'cup',   false, false, 'fresh, packed',            1),
('Green Machine',         'Banana',           1,    'whole', false, false, 'the sweeter the better',   2),
('Green Machine',         'Apple',            1,    'whole', false, false, 'cored, chopped',           3),
('Green Machine',         'Lemon Juice',      1,    'tbsp',  false, true,  'keeps it bright',          4),
('Green Machine',         'Water',            1,    'cup',   false, true,  'or coconut water',         5),
('Green Machine',         'Ice',              1,    'cup',   true,  false, NULL,                       6),
('Peanut Butter Banana',  'Banana',           1,    'whole', false, false, 'frozen for extra thick',   1),
('Peanut Butter Banana',  'Peanut Butter',    2,    'tbsp',  false, false, NULL,                       2),
('Peanut Butter Banana',  'Milk',             1,    'cup',   false, true,  NULL,                       3),
('Peanut Butter Banana',  'Greek Yogurt',     0.5,  'cup',   true,  false, 'extra protein',            4),
('Peanut Butter Banana',  'Oats',             0.25, 'cup',   true,  true,  'rolled',                   5),
('Peanut Butter Banana',  'Cinnamon',         0.25, 'tsp',   true,  true,  NULL,                       6),
('Strawberry Oatmeal',    'Strawberries',     1.5,  'cup',   false, false, 'hulled',                   1),
('Strawberry Oatmeal',    'Banana',           0.5,  'whole', false, false, NULL,                       2),
('Strawberry Oatmeal',    'Oats',             0.5,  'cup',   false, true,  'rolled or quick',          3),
('Strawberry Oatmeal',    'Milk',             1,    'cup',   false, true,  NULL,                       4),
('Strawberry Oatmeal',    'Honey',            1,    'tbsp',  true,  true,  NULL,                       5),
('Mango Lassi',           'Mango',            1.5,  'cup',   false, false, 'ripe or canned pulp',      1),
('Mango Lassi',           'Greek Yogurt',     1,    'cup',   false, false, NULL,                       2),
('Mango Lassi',           'Milk',             0.5,  'cup',   false, true,  NULL,                       3),
('Mango Lassi',           'Honey',            1,    'tbsp',  true,  true,  'traditional is sweeter',   4),
('Mango Lassi',           'Cardamom',         0.1,  'tsp',   true,  true,  'pinch, ground',            5),
('Chocolate Protein Shake','Protein Powder',  1,    'scoop', false, false, 'chocolate or vanilla',     1),
('Chocolate Protein Shake','Banana',          1,    'whole', false, false, NULL,                       2),
('Chocolate Protein Shake','Cocoa Powder',    1,    'tbsp',  false, true,  'unsweetened',              3),
('Chocolate Protein Shake','Milk',            1,    'cup',   false, true,  NULL,                       4),
('Chocolate Protein Shake','Peanut Butter',   1,    'tbsp',  true,  false, NULL,                       5)
) AS v(recipe, item_name, quantity, unit, is_optional, is_pantry_staple, notes, sort_order)
  ON r.name = v.recipe AND r.is_public = true AND r.user_id IS NULL AND r.category = 'smoothie'
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_ingredients ri
  WHERE ri.recipe_id = r.id AND ri.item_name = v.item_name
);
