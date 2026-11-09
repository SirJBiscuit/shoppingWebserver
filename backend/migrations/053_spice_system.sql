-- ============================================================================
-- 053: Spice tracking / blend learning system
--
-- - spices: catalog of known spices with flavor notes, heat, cuisine + dish tags
-- - spice_blends: preset (user_id NULL) and user-created blends
-- - spice_blend_ingredients: blend composition in "parts" for scaling
-- - user_spice_rack: spices the user owns ("pick what spices we have")
-- ============================================================================

CREATE TABLE IF NOT EXISTS spices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(20) DEFAULT '🌿',
  flavor_notes TEXT[] DEFAULT '{}',      -- e.g. {earthy,smoky,citrusy}
  adds VARCHAR(255),                     -- what it adds to a dish
  heat_level SMALLINT DEFAULT 0,         -- 0-5
  cuisine_tags TEXT[] DEFAULT '{}',      -- e.g. {mexican,indian,italian}
  dish_tags TEXT[] DEFAULT '{}',         -- e.g. {chicken,soup,beef,vegetables}
  pairs_with TEXT[] DEFAULT '{}',        -- spice names it combines well with
  is_common BOOLEAN DEFAULT FALSE,       -- shown first in the spice rack
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spice_blends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL = global preset
  name VARCHAR(150) NOT NULL,
  icon VARCHAR(20) DEFAULT '🧂',
  description TEXT,
  dish_tags TEXT[] DEFAULT '{}',         -- what dishes this blend suits
  source VARCHAR(20) DEFAULT 'custom',   -- 'preset' | 'custom' | 'suggested'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spice_blend_ingredients (
  id SERIAL PRIMARY KEY,
  blend_id INTEGER REFERENCES spice_blends(id) ON DELETE CASCADE,
  spice_id INTEGER REFERENCES spices(id) ON DELETE CASCADE,
  parts NUMERIC(6,2) NOT NULL DEFAULT 1, -- proportional amount
  note VARCHAR(100),                     -- optional usage hint ('bloom in oil')
  UNIQUE (blend_id, spice_id)
);

CREATE TABLE IF NOT EXISTS user_spice_rack (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  spice_id INTEGER REFERENCES spices(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, spice_id)
);

CREATE INDEX IF NOT EXISTS idx_spice_blends_user ON spice_blends(user_id);
CREATE INDEX IF NOT EXISTS idx_blend_ingredients_blend ON spice_blend_ingredients(blend_id);
CREATE INDEX IF NOT EXISTS idx_user_rack_user ON user_spice_rack(user_id);

-- ============================================================================
-- SEED: Spice catalog
-- ============================================================================

INSERT INTO spices (name, icon, flavor_notes, adds, heat_level, cuisine_tags, dish_tags, pairs_with, is_common) VALUES
('Salt',             '🧂', '{savory,essential}', 'Amplifies every flavor',                                   0, '{universal}', '{chicken,beef,fish,pasta,soup,vegetables,rice,eggs,bread,steak,pork}', '{black pepper,garlic powder}', TRUE),
('Black Pepper',     '🌶️', '{sharp,piney,warm}', 'Sharp heat and aroma',                                     2, '{universal}', '{chicken,beef,fish,pasta,soup,vegetables,steak,eggs,pork}', '{salt,garlic powder}', TRUE),
('Garlic Powder',    '🧄', '{savory,pungent,sweet}', 'Deep savory backbone',                                 0, '{universal,mexican,italian}', '{chicken,beef,pasta,soup,vegetables,bread,steak,pork,pizza}', '{onion powder,paprika}', TRUE),
('Onion Powder',     '🧅', '{sweet,savory}', 'Mellow allium sweetness',                                      0, '{universal,mexican,american}', '{chicken,beef,soup,vegetables,burgers,pork}', '{garlic powder,paprika}', TRUE),
('Paprika',          '🌶️', '{sweet,peppery,mild}', 'Color and gentle warmth',                                1, '{hungarian,spanish,mexican}', '{chicken,beef,stews,eggs,potatoes,goulash}', '{garlic powder,onion powder,cumin}', TRUE),
('Smoked Paprika',   '🔥', '{smoky,sweet,earthy}', 'Campfire smokiness',                                     1, '{spanish,mexican,american}', '{chicken,bbq,beef,potatoes,beans,stews}', '{paprika,cumin}', FALSE),
('Cumin',            '🌿', '{earthy,warm,nutty}', 'Earthy warmth — the soul of tacos & chili',               1, '{mexican,indian,middle_eastern}', '{chili,tacos,curry,beans,lamb,soup}', '{coriander,chili powder,paprika}', TRUE),
('Chili Powder',     '🔥', '{smoky,spicy,complex}', 'Southwest heat blend base',                             3, '{mexican,tex-mex}', '{chili,tacos,beans,beef}', '{cumin,oregano,garlic powder}', TRUE),
('Oregano',          '🌿', '{herbaceous,peppery}', 'Mediterranean brightness',                               0, '{italian,greek,mexican}', '{pizza,pasta,chicken,sauce,fish,vegetables}', '{basil,garlic powder}', TRUE),
('Basil',            '🌿', '{sweet,anise,fresh}', 'Sweet herbal freshness',                                  0, '{italian,thai}', '{pasta,pizza,chicken,tomatoes,sauce,salad}', '{oregano,garlic powder}', TRUE),
('Thyme',            '🌿', '{earthy,minty,floral}', 'Woody herbal depth',                                    0, '{french,italian,american}', '{chicken,soup,stews,roast,vegetables,lamb}', '{rosemary,bay leaf}', TRUE),
('Rosemary',         '🌿', '{piney,woodsy,strong}', 'Bold pine aroma for roasts',                            0, '{italian,french}', '{chicken,lamb,potatoes,bread,steak,roast}', '{thyme,garlic powder}', TRUE),
('Cinnamon',         '🍂', '{sweet,warm,woody}', 'Warm sweetness — baking & tagines',                        0, '{middle_eastern,mexican,indian}', '{dessert,oatmeal,coffee,tagine,curry}', '{nutmeg,cloves}', TRUE),
('Nutmeg',           '🌰', '{warm,nutty,sweet}', 'Subtle warmth for sauces & bakes',                         0, '{french,italian}', '{dessert,sauce,béchamel,potatoes,spinach}', '{cinnamon,cloves}', FALSE),
('Ginger',           '🫚', '{spicy,sweet,zingy}', 'Bright zing and warmth',                                  2, '{asian,indian,thai}', '{stir fry,curry,chicken,fish,soup,tea}', '{garlic powder,soy}', TRUE),
('Turmeric',         '🟡', '{earthy,bitter,golden}', 'Golden color + anti-inflammatory depth',               0, '{indian,middle_eastern}', '{curry,rice,lentils,soup,vegetables}', '{cumin,coriander,black pepper}', TRUE),
('Coriander',        '🌿', '{citrusy,floral,light}', 'Citrus brightness balancing earthiness',               0, '{indian,mexican,middle_eastern}', '{curry,tacos,beans,salsa,chicken}', '{cumin,chili powder}', TRUE),
('Cayenne',          '🔥', '{fiery,sharp}', 'Straightforward fire',                                          5, '{mexican,cajun,indian}', '{chili,bbq,wings,eggs,chocolate}', '{paprika,garlic powder}', TRUE),
('Red Pepper Flakes','🌶️', '{spicy,sharp,flaky}', 'Finish heat + texture',                                   4, '{italian,american}', '{pizza,pasta,shrimp,vegetables}', '{oregano,garlic powder}', TRUE),
('Curry Powder',     '🍛', '{warm,complex,earthy}', 'Instant Indian base',                                   2, '{indian,british}', '{curry,chicken,rice,vegetables,soup}', '{turmeric,cumin}', TRUE),
('Garam Masala',     '🍛', '{warm,sweet,aromatic}', 'Fragrant finishing spice',                              2, '{indian}', '{curry,chicken,rice,lamb,lentils}', '{turmeric,cumin}', FALSE),
('Bay Leaf',         '🍃', '{herbal,subtle,floral}', 'Slow-cook depth for braises',                          0, '{mediterranean,american}', '{soup,stews,sauce,rice,beans}', '{thyme,black pepper}', TRUE),
('Cloves',           '🌰', '{warm,sweet,intense}', 'Intense sweet warmth',                                   0, '{indian,middle_eastern}', '{ham,tea,dessert,curry,mulled wine}', '{cinnamon,nutmeg}', FALSE),
('Cajun Seasoning',  '🦐', '{spicy,smoky,savory}', 'Louisiana kick',                                         3, '{cajun}', '{shrimp,chicken,fish,rice,gumbo}', '{paprika,garlic powder}', FALSE),
('Italian Seasoning','🌿', '{herbaceous,blended}', 'One-shake Italian herb mix',                             0, '{italian}', '{pasta,pizza,chicken,sauce,bread,vegetables}', '{garlic powder,basil}', TRUE),
('Ranch Seasoning',  '🥗', '{tangy,herbaceous}', 'Buttermilk-herb tang',                                     0, '{american}', '{chicken,salad,potatoes,wings}', '{dill,garlic powder}', FALSE),
('Taco Seasoning',   '🌮', '{savory,smoky,spiced}', 'Ready-made taco flavor',                                2, '{mexican,tex-mex}', '{tacos,beef,chicken,burritos}', '{cumin,chili powder}', FALSE),
('Everything Bagel', '🥯', '{savory,seedy,crunchy}', 'Crunch + allium + salt',                               0, '{american}', '{eggs,avocado toast,bagels,chicken,vegetables}', '{garlic powder,onion powder}', FALSE),
('Lemon Pepper',     '🍋', '{citrusy,sharp}', 'Bright citrus-pepper',                                        1, '{american}', '{chicken,fish,shrimp,vegetables,wings}', '{black pepper,garlic powder}', TRUE),
('Garlic Salt',      '🧂', '{savory,salty}', 'Two-in-one allium salt',                                       0, '{american}', '{popcorn,fries,vegetables,steak}', '{garlic powder,onion powder}', FALSE),
('Dill',             '🌿', '{fresh,grassy,tangy}', 'Fresh grassy brightness',                                0, '{scandinavian,american}', '{fish,salmon,potatoes,salad,dips,cucumber}', '{lemon pepper,black pepper}', FALSE),
('Parsley',          '🌿', '{fresh,mild,green}', 'Clean fresh finish',                                       0, '{mediterranean,american}', '{pasta,chicken,potatoes,salad,garnish}', '{garlic powder,lemon pepper}', TRUE),
('Cilantro',         '🌿', '{citrusy,fresh,green}', 'Bright herbal pop (or soap — you know)',                0, '{mexican,asian,indian}', '{tacos,salsa,curry,rice,soup}', '{lime,cumin}', TRUE),
('Allspice',         '🌰', '{warm,clove-like,complex}', 'Jerk & baking warmth',                              0, '{caribbean,middle_eastern}', '{jerk chicken,dessert,stews,ham}', '{cloves,cinnamon}', FALSE),
('Mustard Powder',   '🟡', '{tangy,sharp,hot}', 'Sharp tangy bite',                                          2, '{american,german}', '{bbq,potato salad,deviled eggs,marinades}', '{paprika,black pepper}', FALSE),
('Fennel Seed',      '🌿', '{sweet,anise,licorice}', 'Sweet licorice notes for sausage',                     0, '{italian,indian}', '{sausage,pasta,pork,fish,bread}', '{oregano,red pepper flakes}', FALSE),
('Cardamom',         '🌰', '{floral,sweet,aromatic}', 'Perfumed sweetness',                                  0, '{indian,middle_eastern,scandinavian}', '{curry,rice,coffee,baking,tea}', '{cinnamon,cloves}', FALSE),
('Sage',             '🌿', '{earthy,peppery,soft}', 'Autumn poultry depth',                                  0, '{italian,american}', '{turkey,stuffing,pork,squash,butter sauce}', '{thyme,rosemary}', FALSE),
('Five Spice',       '🥢', '{sweet,warm,licorice}', 'Chinese warmth + balance',                              1, '{chinese}', '{pork,chicken,stir fry,duck}', '{ginger,garlic powder}', FALSE),
('Zaatar',           '🌿', '{herbaceous,sesame,tangy}', 'Levantine herb-sesame tang',                        0, '{middle_eastern}', '{bread,chicken,vegetables,hummus}', '{sumac,sesame}', FALSE),
('Sumac',            '🔴', '{tart,citrusy}', 'Tart red sparkle',                                             0, '{middle_eastern}', '{salad,chicken,kebab,rice}', '{zaatar,paprika}', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED: Preset blends
-- ============================================================================

-- Clean up duplicate presets first (heals DBs seeded by earlier buggy re-runs)
DELETE FROM spice_blends a USING spice_blends b
WHERE a.user_id IS NULL AND b.user_id IS NULL
  AND a.name = b.name AND a.id > b.id;

INSERT INTO spice_blends (user_id, name, icon, description, dish_tags, source)
SELECT v.user_id, v.name, v.icon, v.description, v.dish_tags, v.source
FROM (VALUES
(NULL::integer, 'Taco Seasoning',   '🌮', 'Classic Tex-Mex taco blend', '{tacos,burritos,fajitas,mexican}'::text[], 'preset'),
(NULL::integer, 'Italian Herb',     '🍝', 'Pasta & pizza all-rounder', '{pasta,pizza,italian,sauce,chicken}'::text[], 'preset'),
(NULL::integer, 'BBQ Rub',          '🍖', 'Sweet-smoky grill rub', '{bbq,ribs,chicken,pork,steak}'::text[], 'preset'),
(NULL::integer, 'Curry Base',       '🍛', 'Warm Indian curry foundation', '{curry,rice,chicken,lamb,vegetables}'::text[], 'preset'),
(NULL::integer, 'Ranch Mix',        '🥗', 'DIY ranch dressing mix', '{chicken,salad,dips,wings,potatoes}'::text[], 'preset'),
(NULL::integer, 'Blackening',       '🔥', 'Cajun blackening for fish & chicken', '{fish,shrimp,chicken,cajun}'::text[], 'preset'),
(NULL::integer, 'Pumpkin Spice',    '🎃', 'Autumn baking blend', '{dessert,baking,coffee,oatmeal}'::text[], 'preset'),
(NULL::integer, 'Herbes de Provence','🇫🇷', 'French roast blend', '{chicken,lamb,potatoes,roast,bread}'::text[], 'preset')
) AS v(user_id, name, icon, description, dish_tags, source)
WHERE NOT EXISTS (
  SELECT 1 FROM spice_blends b WHERE b.user_id IS NULL AND b.name = v.name
);

INSERT INTO spice_blend_ingredients (blend_id, spice_id, parts, note) VALUES
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Taco Seasoning'),   (SELECT id FROM spices WHERE name='Chili Powder'),     4, 'the base'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Taco Seasoning'),   (SELECT id FROM spices WHERE name='Cumin'),            2, 'earthy core'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Taco Seasoning'),   (SELECT id FROM spices WHERE name='Paprika'),          2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Taco Seasoning'),   (SELECT id FROM spices WHERE name='Garlic Powder'),    1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Taco Seasoning'),   (SELECT id FROM spices WHERE name='Onion Powder'),     1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Taco Seasoning'),   (SELECT id FROM spices WHERE name='Oregano'),          0.5, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Taco Seasoning'),   (SELECT id FROM spices WHERE name='Black Pepper'),     0.5, 'to taste'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Taco Seasoning'),   (SELECT id FROM spices WHERE name='Cayenne'),          0.25, 'optional heat'),

((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Italian Herb'),     (SELECT id FROM spices WHERE name='Oregano'),          2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Italian Herb'),     (SELECT id FROM spices WHERE name='Basil'),            2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Italian Herb'),     (SELECT id FROM spices WHERE name='Thyme'),            1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Italian Herb'),     (SELECT id FROM spices WHERE name='Rosemary'),         0.5, 'crush lightly'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Italian Herb'),     (SELECT id FROM spices WHERE name='Garlic Powder'),    1, NULL),

((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='BBQ Rub'),          (SELECT id FROM spices WHERE name='Paprika'),          3, 'base'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='BBQ Rub'),          (SELECT id FROM spices WHERE name='Smoked Paprika'),   1, 'smoke layer'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='BBQ Rub'),          (SELECT id FROM spices WHERE name='Garlic Powder'),    2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='BBQ Rub'),          (SELECT id FROM spices WHERE name='Onion Powder'),     1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='BBQ Rub'),          (SELECT id FROM spices WHERE name='Black Pepper'),     1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='BBQ Rub'),          (SELECT id FROM spices WHERE name='Cumin'),            0.5, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='BBQ Rub'),          (SELECT id FROM spices WHERE name='Cayenne'),          0.5, 'adjust heat'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='BBQ Rub'),          (SELECT id FROM spices WHERE name='Mustard Powder'),   0.5, NULL),

((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Curry Base'),       (SELECT id FROM spices WHERE name='Turmeric'),         3, 'golden base'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Curry Base'),       (SELECT id FROM spices WHERE name='Coriander'),        3, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Curry Base'),       (SELECT id FROM spices WHERE name='Cumin'),            2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Curry Base'),       (SELECT id FROM spices WHERE name='Ginger'),           1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Curry Base'),       (SELECT id FROM spices WHERE name='Garam Masala'),     1, 'finish'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Curry Base'),       (SELECT id FROM spices WHERE name='Cardamom'),         0.5, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Curry Base'),       (SELECT id FROM spices WHERE name='Cayenne'),          0.5, 'to taste'),

((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Ranch Mix'),        (SELECT id FROM spices WHERE name='Parsley'),          2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Ranch Mix'),        (SELECT id FROM spices WHERE name='Dill'),             2, 'the signature'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Ranch Mix'),        (SELECT id FROM spices WHERE name='Garlic Powder'),    2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Ranch Mix'),        (SELECT id FROM spices WHERE name='Onion Powder'),     1.5, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Ranch Mix'),        (SELECT id FROM spices WHERE name='Black Pepper'),     0.5, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Ranch Mix'),        (SELECT id FROM spices WHERE name='Salt'),             1, NULL),

((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Blackening'),       (SELECT id FROM spices WHERE name='Paprika'),          3, 'color + base'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Blackening'),       (SELECT id FROM spices WHERE name='Cayenne'),          2, 'the kick'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Blackening'),       (SELECT id FROM spices WHERE name='Garlic Powder'),    1.5, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Blackening'),       (SELECT id FROM spices WHERE name='Onion Powder'),     1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Blackening'),       (SELECT id FROM spices WHERE name='Thyme'),            1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Blackening'),       (SELECT id FROM spices WHERE name='Oregano'),          1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Blackening'),       (SELECT id FROM spices WHERE name='Black Pepper'),     1, NULL),

((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Pumpkin Spice'),    (SELECT id FROM spices WHERE name='Cinnamon'),         6, 'dominant'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Pumpkin Spice'),    (SELECT id FROM spices WHERE name='Ginger'),           2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Pumpkin Spice'),    (SELECT id FROM spices WHERE name='Nutmeg'),           1.5, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Pumpkin Spice'),    (SELECT id FROM spices WHERE name='Cloves'),           1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Pumpkin Spice'),    (SELECT id FROM spices WHERE name='Allspice'),         1, NULL),

((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Herbes de Provence'),(SELECT id FROM spices WHERE name='Thyme'),           3, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Herbes de Provence'),(SELECT id FROM spices WHERE name='Rosemary'),        2, 'crushed'),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Herbes de Provence'),(SELECT id FROM spices WHERE name='Oregano'),         2, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Herbes de Provence'),(SELECT id FROM spices WHERE name='Basil'),           1, NULL),
((SELECT id FROM spice_blends WHERE user_id IS NULL AND name='Herbes de Provence'),(SELECT id FROM spices WHERE name='Sage'),            1, NULL),
((SELECT id FROM spice_blends WHERE name='Herbes de Provence'),(SELECT id FROM spices WHERE name='Bay Leaf'),        0.5, 'powdered or crushed')
ON CONFLICT (blend_id, spice_id) DO NOTHING;

-- ============================================================================
-- Feature flag
-- ============================================================================

INSERT INTO feature_flags (feature_key, feature_name, description, category, min_tier, is_enabled, hide_from_beta, display_order)
VALUES ('spice_blends', 'Spice Blends', 'Spice rack + blend builder + dish suggester', 'features', 'guest', TRUE, FALSE, 85)
ON CONFLICT (feature_key) DO NOTHING;
