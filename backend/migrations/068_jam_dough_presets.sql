-- ============================================================================
-- 068: Jam Lab + Dough Lab preset recipes
--
-- Same convention as 061 (mix) and 063 (smoothie): public recipes with
-- user_id NULL and a category tag, so Jam Lab and Dough Lab reuse
-- /recipes?category=X + inventory-comparison + mark-cooked — no new endpoints.
-- Idempotent: name+category guard on recipes, recipe_id+item_name on
-- ingredients.
-- ============================================================================

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE recipes ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- SEED: preset jam recipes (category 'jam')
-- ============================================================================

INSERT INTO recipes (user_id, name, description, servings, prep_time, cook_time,
category, cuisine, instructions, is_public)
SELECT NULL::integer, v.name, v.description, v.servings, v.prep_time,
  v.cook_time, 'jam', v.cuisine, v.instructions, true
FROM (VALUES
('Classic Strawberry Jam', 'The benchmark — bright, sweet, and perfect on toast.', 4, 15, 25, 'American',
'1. Hull and crush strawberries (potato masher works great).
2. Combine fruit, lemon juice, and sugar in a wide pot; bring to a rolling boil over medium-high.
3. Stir in pectin if using; boil hard 1-2 minutes, stirring constantly.
4. Skim foam, then jar. Fridge 3 weeks or water-bath can for shelf storage.'),
('Blueberry Lemon Jam', 'Deep purple, gently tart — the lemon keeps it lively.', 4, 15, 25, 'American',
'1. Rinse blueberries; crush about half to release juice.
2. Combine berries, sugar, lemon juice, and zest in a pot; bring to a boil.
3. Simmer 15-20 minutes, stirring often, until it coats a cold spoon.
4. Stir in pectin if you want a firmer set; jar while hot.'),
('Peach Vanilla Jam', 'Late-summer peaches with a warm vanilla finish.', 4, 20, 30, 'American',
'1. Peel and chop peaches (dip in boiling water 30s to slip the skins).
2. Combine peaches, sugar, and lemon juice; simmer 20-25 minutes, mashing to your preferred texture.
3. Stir in vanilla in the last 5 minutes.
4. Jar hot; fridge 3 weeks or process in a water bath.'),
('Raspberry Jam', 'Classic seed-forward jam — strain half the pulp if you prefer seedless.', 4, 15, 20, 'American',
'1. Crush raspberries lightly in the pot.
2. Add sugar and lemon juice; bring to a rolling boil.
3. Boil 10-15 minutes until it sheets off a spoon (220°F for a firm set).
4. Skim and jar. Pectin optional — raspberries set well on their own.'),
('Apple Butter', 'Slow-cooked apples reduced into a spiced spread.', 6, 20, 240, 'American',
'1. Combine chopped apples and cider in a heavy pot; simmer until soft (~30 min).
2. Blend smooth with an immersion blender.
3. Stir in sugars and spices; cook uncovered on low 2-4 hours, stirring every 20-30 minutes, until thick and dark.
4. Jar hot — fridge a month, or water-bath can.'),
('Quick Freezer Berry Jam', 'No canning needed — freezer jam keeps the fresh-fruit taste.', 4, 15, 5, 'American',
'1. Crush mixed berries in a bowl; measure exactly 4 cups.
2. Whisk sugar and pectin together, then stir into the fruit for 3 full minutes.
3. Rest 5 minutes — it should thicken noticeably.
4. Ladle into freezer-safe jars leaving headspace; freeze up to a year, fridge 3 weeks once opened.')
) AS v(name, description, servings, prep_time, cook_time, cuisine, instructions)
WHERE NOT EXISTS (
  SELECT 1 FROM recipes r WHERE r.name = v.name AND r.is_public = true AND r.category = 'jam'
);

-- ============================================================================
-- SEED: preset dough recipes (category 'dough')
-- ============================================================================

INSERT INTO recipes (user_id, name, description, servings, prep_time, cook_time,
category, cuisine, instructions, is_public)
SELECT NULL::integer, v.name, v.description, v.servings, v.prep_time,
  v.cook_time, 'dough', v.cuisine, v.instructions, true
FROM (VALUES
('Classic Pizza Dough', 'Chewy, blistered crust — rises 1 hour, even better cold-proofed overnight.', 2, 20, 15, 'Italian',
'1. Dissolve yeast and sugar in warm water (105-115°F); rest 5-10 min until foamy.
2. Mix in flour, salt, and olive oil; knead 8-10 minutes until smooth and elastic.
3. Cover and rise 1-1.5 hours until doubled (or refrigerate up to 3 days).
4. Divide, shape, top, and bake at your oven''s max temp on a preheated surface.'),
('Soft Sandwich Bread', 'Pillowy everyday loaf that stays soft for days.', 1, 25, 30, 'American',
'1. Warm milk and water to ~110°F; stir in sugar and yeast, rest 5 minutes.
2. Add flour, salt, and softened butter; knead 8-10 minutes.
3. First rise 1 hour until doubled; shape into a greased 9x5 loaf pan.
4. Second rise 30-40 minutes, then bake at 350°F for 30-35 minutes until golden.'),
('Flaky Pie Crust', 'All-butter crust — keep everything cold for maximum flake.', 1, 20, 0, 'American',
'1. Whisk flour, salt, and sugar; cut in cold cubed butter to pea-sized bits.
2. Add ice water a tablespoon at a time until the dough just holds together.
3. Form into a disk, wrap, and chill at least 1 hour.
4. Roll on a floured surface; bake per your pie recipe (blind bake 375°F, 15 min + weights).'),
('Buttermilk Biscuits', 'Tall, layered, and ready in half an hour — the trick is cold butter and a light hand.', 8, 15, 15, 'American',
'1. Whisk flour, baking powder, baking soda, salt, and sugar.
2. Cut in cold butter until crumbly with pea-sized pieces.
3. Stir in cold buttermilk just until combined — do not overmix.
4. Pat to 1-inch, fold twice for layers, cut, and bake at 425°F for 12-15 minutes.'),
('Soft Pretzel Dough', 'Mall-style pretzels — the baking soda bath gives the signature crust.', 8, 25, 12, 'German',
'1. Bloom yeast in warm water with sugar; add flour, salt, and melted butter.
2. Knead 6-8 minutes; rise 1 hour until doubled.
3. Shape into ropes and twist into pretzels.
4. Dip each in simmering baking-soda water 30 seconds, salt, and bake at 450°F for 10-12 minutes.'),
('Cinnamon Roll Dough', 'Rich, soft dough ready for your favorite filling and icing.', 12, 30, 25, 'American',
'1. Warm milk to ~110°F; whisk in yeast and a pinch of the sugar, rest 5 minutes.
2. Add melted butter, remaining sugar, egg, salt, and flour; knead 6-8 minutes.
3. Rise 1-1.5 hours until doubled.
4. Roll out, spread with butter + cinnamon sugar, roll up, slice, rise 30 min, bake at 375°F for 20-25 minutes.')
) AS v(name, description, servings, prep_time, cook_time, cuisine, instructions)
WHERE NOT EXISTS (
  SELECT 1 FROM recipes r WHERE r.name = v.name AND r.is_public = true AND r.category = 'dough'
);

-- ============================================================================
-- SEED: ingredients for jam + dough presets
-- ============================================================================

INSERT INTO recipe_ingredients (recipe_id, item_name, quantity, unit, is_optional, is_pantry_staple, notes, sort_order)
SELECT r.id, v.item_name, v.quantity, v.unit, v.is_optional, v.is_pantry_staple, v.notes, v.sort_order
FROM recipes r
JOIN (VALUES
-- Jam presets
('Classic Strawberry Jam', 'Strawberries',   4,   'cup',    false, false, 'fresh or frozen, hulled',        1),
('Classic Strawberry Jam', 'Sugar',          3,   'cup',    false, true,  NULL,                            2),
('Classic Strawberry Jam', 'Lemon Juice',    2,   'tbsp',   false, true,  'bottled is fine',                 3),
('Classic Strawberry Jam', 'Pectin',         1,   'pouch',  true,  true,  'for a firmer set',                4),
('Blueberry Lemon Jam',    'Blueberries',    4,   'cup',    false, false, 'fresh or frozen',                 1),
('Blueberry Lemon Jam',    'Sugar',          2.5, 'cup',    false, true,  NULL,                            2),
('Blueberry Lemon Jam',    'Lemon Juice',    2,   'tbsp',   false, true,  NULL,                            3),
('Blueberry Lemon Jam',    'Lemon Zest',     1,   'tbsp',   true,  false, 'from ~1 lemon',                   4),
('Blueberry Lemon Jam',    'Pectin',         1,   'pouch',  true,  true,  NULL,                            5),
('Peach Vanilla Jam',      'Peaches',        4,   'cup',    false, false, 'peeled, chopped',                 1),
('Peach Vanilla Jam',      'Sugar',          2.5, 'cup',    false, true,  NULL,                            2),
('Peach Vanilla Jam',      'Lemon Juice',    2,   'tbsp',   false, true,  NULL,                            3),
('Peach Vanilla Jam',      'Vanilla Extract',1,   'tsp',    true,  true,  'or half a vanilla bean',          4),
('Peach Vanilla Jam',      'Pectin',         1,   'pouch',  true,  true,  NULL,                            5),
('Raspberry Jam',          'Raspberries',    4,   'cup',    false, false, 'fresh or frozen',                 1),
('Raspberry Jam',          'Sugar',          3,   'cup',    false, true,  NULL,                            2),
('Raspberry Jam',          'Lemon Juice',    1,   'tbsp',   false, true,  NULL,                            3),
('Raspberry Jam',          'Pectin',         1,   'pouch',  true,  true,  'sets without it too',             4),
('Apple Butter',           'Apples',         6,   'cup',    false, false, 'peeled, cored, chopped',          1),
('Apple Butter',           'Apple Cider',    1,   'cup',    false, false, 'or apple juice',                  2),
('Apple Butter',           'Brown Sugar',    1,   'cup',    false, true,  NULL,                            3),
('Apple Butter',           'Sugar',          0.5, 'cup',    true,  true,  'adjust to taste',                 4),
('Apple Butter',           'Cinnamon',       2,   'tsp',    false, true,  'ground',                          5),
('Apple Butter',           'Nutmeg',         0.5, 'tsp',    true,  true,  'ground',                          6),
('Apple Butter',           'Cloves',         0.25,'tsp',    true,  true,  'ground',                          7),
('Quick Freezer Berry Jam','Mixed Berries',  4,   'cup',    false, false, 'any combo, crushed',              1),
('Quick Freezer Berry Jam','Sugar',          1.5, 'cup',    false, true,  NULL,                            2),
('Quick Freezer Berry Jam','Pectin',         1,   'pouch',  false, true,  'freezer-jam pectin preferred',    3),
('Quick Freezer Berry Jam','Lemon Juice',    1,   'tbsp',   true,  true,  NULL,                            4),
-- Dough presets
('Classic Pizza Dough',    'Bread Flour',    3.5, 'cup',    false, true,  'AP flour works too',              1),
('Classic Pizza Dough',    'Instant Yeast',  2.25,'tsp',    false, true,  'one packet',                      2),
('Classic Pizza Dough',    'Warm Water',     1.5, 'cup',    false, true,  '105-115°F',                       3),
('Classic Pizza Dough',    'Olive Oil',      2,   'tbsp',   false, true,  NULL,                            4),
('Classic Pizza Dough',    'Salt',           1.5, 'tsp',    false, true,  NULL,                            5),
('Classic Pizza Dough',    'Sugar',          1,   'tsp',    true,  true,  'feeds the yeast',                 6),
('Soft Sandwich Bread',    'Bread Flour',    3,   'cup',    false, true,  NULL,                            1),
('Soft Sandwich Bread',    'Instant Yeast',  2.25,'tsp',    false, true,  'one packet',                      2),
('Soft Sandwich Bread',    'Milk',           1,   'cup',    false, true,  'warm',                            3),
('Soft Sandwich Bread',    'Water',          0.5, 'cup',    false, true,  'warm',                            4),
('Soft Sandwich Bread',    'Butter',         3,   'tbsp',   false, false, 'softened',                        5),
('Soft Sandwich Bread',    'Sugar',          2,   'tbsp',   false, true,  NULL,                            6),
('Soft Sandwich Bread',    'Salt',           1.5, 'tsp',    false, true,  NULL,                            7),
('Flaky Pie Crust',        'Flour',          2.5, 'cup',    false, true,  'all-purpose',                     1),
('Flaky Pie Crust',        'Butter',         1,   'cup',    false, false, 'cold, cubed',                     2),
('Flaky Pie Crust',        'Ice Water',      6,   'tbsp',   false, true,  'add gradually',                   3),
('Flaky Pie Crust',        'Salt',           1,   'tsp',    false, true,  NULL,                            4),
('Flaky Pie Crust',        'Sugar',          1,   'tbsp',   true,  true,  'for sweet pies',                  5),
('Buttermilk Biscuits',    'Flour',          2.5, 'cup',    false, true,  'all-purpose',                     1),
('Buttermilk Biscuits',    'Buttermilk',     1,   'cup',    false, false, 'cold',                            2),
('Buttermilk Biscuits',    'Butter',         0.5, 'cup',    false, false, 'cold, cubed',                     3),
('Buttermilk Biscuits',    'Baking Powder',  1,   'tbsp',   false, true,  NULL,                            4),
('Buttermilk Biscuits',    'Baking Soda',    0.5, 'tsp',    false, true,  NULL,                            5),
('Buttermilk Biscuits',    'Salt',           1,   'tsp',    false, true,  NULL,                            6),
('Buttermilk Biscuits',    'Sugar',          1,   'tbsp',   true,  true,  NULL,                            7),
('Soft Pretzel Dough',     'Flour',          4,   'cup',    false, true,  'all-purpose or bread',            1),
('Soft Pretzel Dough',     'Instant Yeast',  2.25,'tsp',    false, true,  'one packet',                      2),
('Soft Pretzel Dough',     'Warm Water',     1.5, 'cup',    false, true,  NULL,                            3),
('Soft Pretzel Dough',     'Butter',         2,   'tbsp',   false, false, 'melted',                          4),
('Soft Pretzel Dough',     'Sugar',          1,   'tbsp',   false, true,  NULL,                            5),
('Soft Pretzel Dough',     'Salt',           1.5, 'tsp',    false, true,  'plus coarse salt for topping',    6),
('Soft Pretzel Dough',     'Baking Soda',    0.5, 'cup',    true,  true,  'for the bath',                    7),
('Cinnamon Roll Dough',    'Flour',          3.5, 'cup',    false, true,  'all-purpose or bread',            1),
('Cinnamon Roll Dough',    'Instant Yeast',  2.25,'tsp',    false, true,  'one packet',                      2),
('Cinnamon Roll Dough',    'Milk',           1,   'cup',    false, true,  'warm',                            3),
('Cinnamon Roll Dough',    'Butter',         0.33,'cup',    false, false, 'melted',                          4),
('Cinnamon Roll Dough',    'Sugar',          0.5, 'cup',    false, true,  NULL,                            5),
('Cinnamon Roll Dough',    'Egg',            1,   'whole',  false, false, 'room temp',                       6),
('Cinnamon Roll Dough',    'Salt',           1,   'tsp',    false, true,  NULL,                            7)
) AS v(recipe, item_name, quantity, unit, is_optional, is_pantry_staple, notes, sort_order)
ON r.name = v.recipe AND r.is_public = true AND r.user_id IS NULL
   AND r.category IN ('jam', 'dough')
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_ingredients ri
  WHERE ri.recipe_id = r.id AND ri.item_name = v.item_name
);
