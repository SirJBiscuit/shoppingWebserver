-- ============================================================================
-- 061: Mix Lab preset recipes
--
-- Recipes API already supports is_public + category filtering, and
-- recipeInventoryService does home-inventory cross-referencing — so preset
-- "make it yourself" mixes (pesto, tzatziki, guac…) are just public recipes
-- with category 'mix'. user_id NULL = global preset (same convention as
-- spice_blends presets from 053).
-- ============================================================================

-- Public-preset support (routes already filter on r.is_public — add defensively)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE recipes ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- SCHEMA RECONCILE: migration 034 created recipes with recipe_name and
-- recipe_ingredients with ingredient_name, while routes + these seeds use
-- name/item_name. Add the modern columns, backfill from legacy ones, and drop
-- the legacy NOT NULLs so both conventions coexist safely.
-- ============================================================================
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions TEXT;
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'recipe_name'
  ) THEN
    EXECUTE 'UPDATE recipes SET name = recipe_name WHERE name IS NULL';
    EXECUTE 'ALTER TABLE recipes ALTER COLUMN recipe_name DROP NOT NULL';
  END IF;
END $do$;

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT FALSE;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS is_pantry_staple BOOLEAN DEFAULT FALSE;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipe_ingredients' AND column_name = 'ingredient_name'
  ) THEN
    EXECUTE 'UPDATE recipe_ingredients SET item_name = ingredient_name WHERE item_name IS NULL';
    EXECUTE 'ALTER TABLE recipe_ingredients ALTER COLUMN ingredient_name DROP NOT NULL';
  END IF;
END $do$;

-- ============================================================================
-- SEED: preset mix recipes
-- ============================================================================

INSERT INTO recipes (user_id, name, description, servings, prep_time, category, cuisine, instructions, is_public)
SELECT NULL::integer, v.name, v.description, v.servings, v.prep_time, 'mix', v.cuisine, v.instructions, true
FROM (VALUES
('Classic Basil Pesto', 'Fresh basil pesto — toss with pasta, spread on sandwiches, or drizzle over eggs.', 8, 10, 'Italian',
 '1. Toast the pine nuts briefly in a dry pan until fragrant (optional).
2. Blend basil, pine nuts, garlic, and parmesan until coarse.
3. Stream in olive oil while blending to a spreadable paste.
4. Season with salt and a squeeze of lemon. Keeps ~5 days refrigerated under a thin oil layer.'),
('Tzatziki', 'Cool Greek cucumber-yogurt dip — great with pitas, gyros, or as a veggie dip.', 6, 10, 'Greek',
 '1. Grate the cucumber and squeeze out as much water as possible.
2. Stir cucumber into greek yogurt with minced garlic, dill, lemon juice, and olive oil.
3. Season with salt and rest 30 minutes for flavors to meld.'),
('Guacamole', 'Chunky classic guac — limey, fresh, and ready in ten minutes.', 4, 10, 'Mexican',
 '1. Halve, pit, and scoop the avocados into a bowl; mash to desired chunkiness.
2. Fold in lime juice, diced onion, cilantro, and jalapeño.
3. Season with salt; stir in diced tomato if using. Serve immediately.'),
('Hummus', 'Silky chickpea hummus — cheaper and fresher than store-bought.', 8, 10, 'Middle Eastern',
 '1. Drain chickpeas, reserving a splash of the can liquid (aquafaba).
2. Blend chickpeas, tahini, lemon juice, garlic, cumin, and salt with olive oil.
3. Thin with aquafaba until silky. Finish with a swirl of olive oil.'),
('Ranch Dressing', 'Classic buttermilk ranch — dip, drizzle, or dress.', 8, 5, 'American',
 '1. Whisk mayonnaise, sour cream, and buttermilk until smooth.
2. Stir in dill, parsley, garlic powder, onion powder, salt, and pepper.
3. Thin with more buttermilk for dressing, or keep thick as a dip. Rest 30 minutes.'),
('Chimichurri', 'Bright Argentinian herb sauce — amazing on grilled steak, chicken, or bread.', 8, 10, 'Argentinian',
 '1. Finely chop parsley (or pulse in processor — do not puree).
2. Stir in minced garlic, red wine vinegar, oregano, and red pepper flakes.
3. Whisk in olive oil and salt; rest at least 30 minutes before serving.'),
('Pico de Gallo', 'Fresh chunky tomato salsa — brighter than anything in a jar.', 6, 10, 'Mexican',
 '1. Dice tomatoes, onion, and jalapeño; chop cilantro.
2. Combine with lime juice and salt.
3. Rest 15 minutes; drain excess juice if too watery.'),
('Honey Mustard', 'Three-ingredient staple — dip, dressing, or sandwich spread.', 6, 5, 'American',
 '1. Whisk mayonnaise, dijon mustard, and honey until smooth.
2. Brighten with lemon juice and season with a pinch of salt.
3. Thin with a splash of water or vinegar for a pourable dressing.')
) AS v(name, description, servings, prep_time, cuisine, instructions)
WHERE NOT EXISTS (
  SELECT 1 FROM recipes r WHERE r.name = v.name AND r.is_public = true
);

-- ============================================================================
-- SEED: ingredients for each preset (idempotent per recipe+ingredient)
-- ============================================================================

INSERT INTO recipe_ingredients (recipe_id, item_name, quantity, unit, is_optional, is_pantry_staple, notes, sort_order)
SELECT r.id, v.item_name, v.quantity, v.unit, v.is_optional, v.is_pantry_staple, v.notes, v.sort_order
FROM recipes r
JOIN (VALUES
('Classic Basil Pesto', 'Fresh Basil',      2,    'cup',   false, false, 'packed',                    1),
('Classic Basil Pesto', 'Pine Nuts',        0.25, 'cup',   false, false, 'walnuts work too',          2),
('Classic Basil Pesto', 'Garlic',           2,    'clove', false, true,  'minced',                    3),
('Classic Basil Pesto', 'Parmesan Cheese',  0.5,  'cup',   false, false, 'grated',                    4),
('Classic Basil Pesto', 'Olive Oil',        0.5,  'cup',   false, true,  'extra virgin',              5),
('Classic Basil Pesto', 'Salt',             0.5,  'tsp',   false, true,  NULL,                        6),
('Classic Basil Pesto', 'Lemon Juice',      1,    'tbsp',  true,  false, 'brightens it',              7),
('Tzatziki',            'Greek Yogurt',     1.5,  'cup',   false, false, 'full fat is best',          1),
('Tzatziki',            'Cucumber',         1,    'whole', false, false, 'grated + squeezed dry',     2),
('Tzatziki',            'Garlic',           2,    'clove', false, true,  'minced',                    3),
('Tzatziki',            'Fresh Dill',       1,    'tbsp',  false, false, 'or 1 tsp dried',            4),
('Tzatziki',            'Lemon Juice',      1,    'tbsp',  false, true,  NULL,                        5),
('Tzatziki',            'Olive Oil',        1,    'tbsp',  false, true,  NULL,                        6),
('Tzatziki',            'Salt',             0.5,  'tsp',   false, true,  NULL,                        7),
('Guacamole',           'Avocado',          3,    'whole', false, false, 'ripe',                      1),
('Guacamole',           'Lime',             1,    'whole', false, false, 'juiced',                    2),
('Guacamole',           'Red Onion',        0.25, 'whole', false, false, 'finely diced',              3),
('Guacamole',           'Cilantro',         2,    'tbsp',  false, false, 'chopped',                   4),
('Guacamole',           'Jalapeño',         1,    'whole', true,  false, 'seeded, to taste',          5),
('Guacamole',           'Tomato',           0.5,  'whole', true,  false, 'diced',                     6),
('Guacamole',           'Salt',             0.5,  'tsp',   false, true,  NULL,                        7),
('Hummus',              'Chickpeas',        1,    'can',   false, false, '15oz, reserve liquid',      1),
('Hummus',              'Tahini',           0.25, 'cup',   false, false, NULL,                        2),
('Hummus',              'Lemon Juice',      2,    'tbsp',  false, true,  NULL,                        3),
('Hummus',              'Garlic',           1,    'clove', false, true,  NULL,                        4),
('Hummus',              'Olive Oil',        2,    'tbsp',  false, true,  'plus a swirl on top',       5),
('Hummus',              'Cumin',            0.5,  'tsp',   true,  true,  NULL,                        6),
('Hummus',              'Salt',             0.5,  'tsp',   false, true,  NULL,                        7),
('Ranch Dressing',      'Mayonnaise',       0.5,  'cup',   false, false, NULL,                        1),
('Ranch Dressing',      'Sour Cream',       0.5,  'cup',   false, false, NULL,                        2),
('Ranch Dressing',      'Buttermilk',       0.25, 'cup',   false, false, 'thins to dressing',         3),
('Ranch Dressing',      'Fresh Dill',       1,    'tsp',   false, false, 'or 1/2 tsp dried',          4),
('Ranch Dressing',      'Fresh Parsley',    1,    'tsp',   true,  false, NULL,                        5),
('Ranch Dressing',      'Garlic Powder',    0.5,  'tsp',   false, true,  NULL,                        6),
('Ranch Dressing',      'Onion Powder',     0.5,  'tsp',   false, true,  NULL,                        7),
('Ranch Dressing',      'Salt',             0.25, 'tsp',   false, true,  NULL,                        8),
('Ranch Dressing',      'Black Pepper',     0.25, 'tsp',   false, true,  NULL,                        9),
('Chimichurri',         'Fresh Parsley',    1,    'cup',   false, false, 'finely chopped',            1),
('Chimichurri',         'Garlic',           4,    'clove', false, true,  'minced',                    2),
('Chimichurri',         'Red Wine Vinegar', 2,    'tbsp',  false, true,  NULL,                        3),
('Chimichurri',         'Olive Oil',        0.5,  'cup',   false, true,  NULL,                        4),
('Chimichurri',         'Oregano',          1,    'tsp',   false, true,  'dried',                     5),
('Chimichurri',         'Red Pepper Flakes',0.5,  'tsp',   true,  true,  'heat',                      6),
('Chimichurri',         'Salt',             0.5,  'tsp',   false, true,  NULL,                        7),
('Pico de Gallo',       'Tomatoes',         3,    'whole', false, false, 'roma preferred',            1),
('Pico de Gallo',       'White Onion',      0.5,  'whole', false, false, 'diced',                     2),
('Pico de Gallo',       'Cilantro',         0.25, 'cup',   false, false, 'chopped',                   3),
('Pico de Gallo',       'Lime',             1,    'whole', false, false, 'juiced',                    4),
('Pico de Gallo',       'Jalapeño',         1,    'whole', true,  false, 'seeded, to taste',          5),
('Pico de Gallo',       'Salt',             0.5,  'tsp',   false, true,  NULL,                        6),
('Honey Mustard',       'Mayonnaise',       0.5,  'cup',   false, false, NULL,                        1),
('Honey Mustard',       'Dijon Mustard',    0.25, 'cup',   false, false, 'or yellow mustard',         2),
('Honey Mustard',       'Honey',            2,    'tbsp',  false, false, NULL,                        3),
('Honey Mustard',       'Lemon Juice',      1,    'tsp',   true,  true,  'brightens it',              4),
('Honey Mustard',       'Salt',             0.1,  'tsp',   true,  true,  'pinch',                     5)
) AS v(recipe, item_name, quantity, unit, is_optional, is_pantry_staple, notes, sort_order)
  ON r.name = v.recipe AND r.is_public = true AND r.user_id IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_ingredients ri
  WHERE ri.recipe_id = r.id AND ri.item_name = v.item_name
);
