-- ============================================================================
-- 057: Expanded spice/seasoning catalog
--
-- ~65 additional seasonings on top of the 053 base catalog.
-- Idempotent: ON CONFLICT (name) DO NOTHING so re-runs are safe.
-- ============================================================================

INSERT INTO spices (name, icon, flavor_notes, adds, heat_level, cuisine_tags, dish_tags, pairs_with, is_common) VALUES
-- Peppers & chiles
('White Pepper',      '⚪', '{earthy,sharp,mild-heat}', 'Subtle heat without black flecks',                     2, '{asian,french}', '{soup,stir fry,mashed potatoes,sauce,chicken}', '{ginger,garlic powder}', FALSE),
('Ancho Chili',       '🌶️', '{smoky,sweet,mild}', 'Dried poblano — raisiny depth',                             2, '{mexican}', '{chili,mole,tacos,stews,beef}', '{cumin,garlic powder}', FALSE),
('Chipotle Powder',   '🔥', '{smoky,hot,earthy}', 'Smoked jalapeño fire',                                      4, '{mexican,tex-mex}', '{chili,tacos,bbq,chicken,beans}', '{cumin,smoked paprika}', FALSE),
('Aleppo Pepper',     '🌶️', '{fruity,warm,oily}', 'Warm Middle-Eastern heat',                                  3, '{middle_eastern,mediterranean}', '{chicken,kebab,vegetables,eggs,meze}', '{sumac,zaatar}', FALSE),
('Gochugaru',         '🌶️', '{smoky,sweet,vibrant}', 'Korean chile flakes',                                    3, '{korean,asian}', '{kimchi,stir fry,soup,wings,marinades}', '{ginger,garlic powder}', FALSE),
('Sichuan Pepper',    '🌶️', '{numbing,citrusy,tingling}', 'Tingly numbing buzz',                               3, '{chinese,asian}', '{stir fry,noodles,mapo tofu,chicken}', '{ginger,five spice}', FALSE),
('Ghost Pepper',      '☠️', '{extreme,fiery,fruity}', 'Serious heat — use a pinch',                            5, '{indian,american}', '{wings,chili,hot sauce,bbq}', '{cayenne,paprika}', FALSE),
('Habanero Powder',   '🔥', '{fruity,very-hot,floral}', 'Fruity tropical fire',                                5, '{mexican,caribbean}', '{salsa,tacos,wings,marinades}', '{lime,cilantro}', FALSE),
('Poblano Powder',    '🫑', '{mild,earthy,green}', 'Mild green chile earthiness',                              1, '{mexican}', '{soup,tacos,enchiladas,beans}', '{cumin,garlic powder}', FALSE),
-- Everyday blends & salts
('Seasoned Salt',     '🧂', '{savory,salty,complex}', 'All-purpose table seasoning',                           0, '{american}', '{fries,chicken,eggs,vegetables,steak,popcorn}', '{garlic powder,paprika}', TRUE),
('Onion Salt',        '🧅', '{savory,salty}', 'Onion + salt shortcut',                                         0, '{american}', '{burgers,fries,soup,chicken}', '{garlic salt,onion powder}', FALSE),
('Celery Salt',       '🧂', '{savory,vegetal,salty}', 'Savory celery-seed salt',                               0, '{american}', '{potato salad,bloody mary,coleslaw,chicago dogs}', '{celery seed,paprika}', FALSE),
('Old Bay',           '🦀', '{savory,spicy,briny}', 'Classic seafood boil seasoning',                          2, '{american,cajun}', '{shrimp,crab,fish,fries,chowder,wings}', '{cajun seasoning,lemon pepper}', TRUE),
('Poultry Seasoning', '🍗', '{herbaceous,sage-forward}', 'Instant stuffing flavor',                            0, '{american}', '{turkey,chicken,stuffing,gravy,soup}', '{sage,thyme}', TRUE),
('Montreal Steak',    '🥩', '{coarse,garlicky,peppery}', 'Crusty grill seasoning',                             2, '{american}', '{steak,burgers,beef,potatoes,pork}', '{black pepper,garlic powder}', TRUE),
('Adobo Seasoning',   '🧂', '{savory,garlicky,earthy}', 'Latin all-purpose seasoning',                         1, '{latin,mexican,caribbean}', '{chicken,rice,beans,pork,vegetables}', '{oregano,cumin}', TRUE),
('Jerk Seasoning',    '🌴', '{spicy,sweet,smoky}', 'Jamaican heat + allspice',                                 4, '{caribbean,jamaican}', '{chicken,pork,shrimp,rice}', '{allspice,thyme}', FALSE),
('Creole Seasoning',  '🦐', '{savory,peppery,herbaceous}', 'New Orleans table seasoning',                      2, '{cajun,american}', '{gumbo,shrimp,chicken,rice,jambalaya}', '{cajun seasoning,paprika}', TRUE),
('Fajita Seasoning',  '🌮', '{smoky,savory,citrusy}', 'Sizzling fajita mix',                                   2, '{mexican,tex-mex}', '{fajitas,chicken,steak,peppers,onions}', '{cumin,lime}', TRUE),
('Greek Seasoning',   '🇬🇷', '{herbaceous,lemony}', 'Mediterranean herb-lemon blend',                          0, '{greek,mediterranean}', '{chicken,lamb,potatoes,gyro,salad}', '{oregano,lemon pepper}', FALSE),
('Shawarma Spice',    '🥙', '{warm,earthy,aromatic}', 'Street-shawarma warmth',                                1, '{middle_eastern}', '{chicken,lamb,beef,wraps,rice}', '{cumin,turmeric}', FALSE),
('Ras el Hanout',     '🌸', '{warm,floral,complex}', 'Moroccan top-shelf blend',                               1, '{moroccan,middle_eastern}', '{tagine,couscous,lamb,chicken,vegetables}', '{cinnamon,cumin}', FALSE),
('Baharat',           '🌰', '{warm,peppery,sweet}', 'Levant 7-spice warmth',                                   1, '{middle_eastern}', '{beef,lamb,rice,soup,kebab}', '{cumin,allspice}', FALSE),
('Berbere',           '🔥', '{spicy,warm,complex}', 'Ethiopian fire blend',                                    4, '{ethiopian,african}', '{stews,lentils,chicken,beef}', '{paprika,ginger}', FALSE),
('Harissa Powder',    '🔥', '{smoky,hot,caraway}', 'North African chile punch',                                4, '{north_african,middle_eastern}', '{couscous,chicken,vegetables,stews,eggs}', '{cumin,coriander}', FALSE),
('Chimichurri Blend', '🌿', '{herbaceous,garlicky,tangy}', 'Argentinian green sauce base',                     1, '{latin,argentinian}', '{steak,chicken,fish,vegetables}', '{oregano,red pepper flakes}', FALSE),
('Chili Lime',        '🍋', '{tangy,spicy,bright}', 'Tajín-style chile lime',                                  2, '{mexican}', '{fruit,corn,chicken,tacos,snacks}', '{cilantro,cayenne}', FALSE),
('Pumpkin Pie Spice', '🎃', '{warm,sweet,baking}', 'Instant autumn in a jar',                                  0, '{american}', '{pie,dessert,coffee,oatmeal,baking}', '{cinnamon,nutmeg}', TRUE),
('Apple Pie Spice',   '🍎', '{warm,sweet,baking}', 'Classic apple-dessert warmth',                             0, '{american}', '{pie,dessert,baking,oatmeal}', '{cinnamon,allspice}', FALSE),
('Chai Spice',        '🍵', '{warm,spicy,aromatic}', 'Tea-time cardamom warmth',                               0, '{indian}', '{tea,coffee,dessert,oatmeal,baking}', '{cardamom,ginger}', FALSE),
('Curry Leaves',      '🍃', '{citrusy,nutty,herbal}', 'South Indian tempering aroma',                          0, '{indian}', '{curry,lentils,rice,chutney}', '{mustard seed,cumin}', FALSE),
('Furikake',          '🍚', '{savory,umami,seaweed}', 'Japanese rice topper',                                  0, '{japanese,asian}', '{rice,eggs,noodles,fish}', '{sesame seed,ginger}', FALSE),
('Togarashi',         '🌶️', '{spicy,citrusy,sesame}', 'Japanese 7-spice heat',                                 3, '{japanese,asian}', '{noodles,rice,chicken,soup,fish}', '{sichuan pepper,sesame seed}', FALSE),
('Dukkah',            '🥜', '{nutty,earthy,aromatic}', 'Egyptian nut-spice crunch',                            1, '{middle_eastern,egyptian}', '{bread,eggs,salad,vegetables,chicken}', '{coriander,sesame seed}', FALSE),
('Herbes de Provence','🇫🇷', '{floral,herbaceous,lavender}', 'Provence herb field',                            0, '{french}', '{chicken,roast,potatoes,lamb,bread,vegetables}', '{thyme,rosemary}', FALSE),
('Lemon Herb',        '🍋', '{citrusy,herbaceous,bright}', 'Bright lemon-herb mix',                            0, '{mediterranean,american}', '{chicken,fish,shrimp,vegetables,rice}', '{lemon pepper,dill}', FALSE),
('Mesquite Seasoning','🪵', '{smoky,savory,woody}', 'Backyard-smoke flavor',                                   1, '{american,tex-mex}', '{bbq,chicken,steak,pork,vegetables}', '{smoked paprika,garlic powder}', FALSE),
('Pickling Spice',    '🥒', '{warm,tangy,aromatic}', 'Classic pickle brine blend',                             1, '{american,european}', '{pickles,corned beef,sauerkraut,vegetables}', '{mustard seed,bay leaf}', FALSE),
('Pizza Seasoning',   '🍕', '{herbaceous,garlicky,spicy}', 'Shake-on pizzeria flavor',                         1, '{italian,american}', '{pizza,pasta,bread,sauce}', '{oregano,red pepper flakes}', TRUE),
('Sazon',             '🟠', '{savory,achiote,garlicky}', 'Latin color + umami',                                0, '{latin,caribbean}', '{rice,beans,chicken,stews}', '{adobo seasoning,annatto}', FALSE),
('Steak Seasoning',   '🥩', '{coarse,peppery,garlicky}', 'Generic grill crust blend',                          2, '{american}', '{steak,burgers,pork,potatoes}', '{montreal steak,black pepper}', FALSE),
('Umami Seasoning',   '🍄', '{savory,mushroom,deep}', 'Savory fifth-taste booster',                            0, '{asian,american}', '{stir fry,soup,meat,vegetables,rice}', '{garlic powder,ginger}', FALSE),
('Wasabi Powder',     '🍣', '{sharp,sinus-heat,green}', 'Horseradish nose-burn',                               4, '{japanese}', '{sushi,fish,dressings,snacks}', '{horseradish powder,ginger}', FALSE),
('Horseradish Powder','🌶️', '{sharp,pungent,hot}', 'Roast-beef bite',                                          3, '{american,european}', '{beef,sandwiches,dressings,potatoes}', '{mustard powder,black pepper}', FALSE),
-- Seeds, herbs & aromatics
('Sesame Seed',       '🌱', '{nutty,toasty,mild}', 'Toasty nutty crunch',                                      0, '{asian,middle_eastern}', '{stir fry,bread,sushi,chicken,salad}', '{ginger,gochugaru}', TRUE),
('Poppy Seed',        '🌱', '{nutty,mild,crunchy}', 'Bakery crunch',                                           0, '{european,middle_eastern}', '{bagels,baking,dressings,lemon cake}', '{everything bagel,sesame seed}', FALSE),
('Mustard Seed',      '🟡', '{pungent,sharp,popping}', 'Tempering pop + pickle bite',                          2, '{indian,american}', '{pickles,curry,lentils,dal,sauerkraut}', '{curry leaves,cumin}', FALSE),
('Caraway Seed',      '🌱', '{earthy,anise,rye}', 'Rye-bread signature',                                       0, '{german,eastern_european}', '{bread,sauerkraut,pork,stews,rye}', '{fennel seed,dill}', FALSE),
('Celery Seed',       '🌱', '{bitter,vegetal,concentrated}', 'Concentrated celery punch',                      0, '{american}', '{coleslaw,potato salad,bloody mary,pickles,soup}', '{celery salt,dill}', FALSE),
('Nigella Seed',      '🖤', '{peppery,oniony,bitter}', 'Black-seed peppery crunch',                            1, '{indian,middle_eastern}', '{naan,bread,pickles,curry,vegetables}', '{cumin,coriander}', FALSE),
('Fenugreek',         '🌱', '{maple,bitter,curry}', 'Curry-house maple depth',                                 0, '{indian,middle_eastern}', '{curry,lentils,chicken,potatoes}', '{turmeric,cumin}', FALSE),
('Star Anise',        '⭐', '{sweet,licorice,warm}', 'Beautiful licorice warmth',                              0, '{chinese,vietnamese,indian}', '{pho,stews,tea,braising,baking}', '{five spice,cinnamon}', FALSE),
('Anise Seed',        '🌱', '{sweet,licorice,mild}', 'Sweet licorice cookies',                                 0, '{italian,mexican}', '{baking,bread,cookies,sausage}', '{fennel seed,cinnamon}', FALSE),
('Ajwain',            '🌱', '{thyme-like,bitter,sharp}', 'Indian thyme kick',                                  1, '{indian}', '{bread,curry,lentils,pakoras,potatoes}', '{cumin,coriander}', FALSE),
('Marjoram',          '🌿', '{sweet,floral,oregano-like}', 'Softer oregano',                                   0, '{mediterranean,german}', '{sausage,chicken,soup,vegetables,sauce}', '{oregano,thyme}', FALSE),
('Tarragon',          '🌿', '{anise,french,elegant}', 'French béarnaise herb',                                 0, '{french}', '{chicken,fish,eggs,sauces,salad}', '{parsley,chives}', FALSE),
('Chives',            '🌿', '{mild,oniony,fresh}', 'Delicate onion finish',                                    0, '{french,american}', '{potatoes,eggs,soup,salad,dips}', '{parsley,tarragon}', TRUE),
('Mint',              '🌿', '{cool,fresh,sweet}', 'Cooling freshness',                                         0, '{middle_eastern,indian,american}', '{tea,lamb,salad,yogurt,dessert,drinks}', '{cilantro,parsley}', TRUE),
('Lemongrass',        '🌿', '{citrusy,lemony,fresh}', 'Thai citrus stalks',                                    0, '{thai,vietnamese,asian}', '{curry,soup,chicken,fish,stir fry,tea}', '{ginger,cilantro}', FALSE),
('Saffron',           '🟡', '{floral,honeyed,luxurious}', 'Golden threads of luxury',                          0, '{spanish,indian,middle_eastern}', '{paella,rice,risotto,soup,biryani}', '{turmeric,cardamom}', FALSE),
('Vanilla Bean',      '🌸', '{sweet,floral,creamy}', 'Real-deal dessert warmth',                               0, '{french,american}', '{dessert,baking,coffee,ice cream,oatmeal}', '{cinnamon,nutmeg}', FALSE),
('Mace',              '🌰', '{warm,nutty,refined}', 'Nutmeg''s elegant sister',                                0, '{indian,french}', '{baking,béchamel,sausages,soup}', '{nutmeg,cinnamon}', FALSE),
('Juniper Berries',   '🫐', '{piney,gin-like,sharp}', 'Gin botanical for game',                                0, '{german,european}', '{venison,sauerkraut,stews,pork,marinades}', '{bay leaf,black pepper}', FALSE),
('Annatto',           '🟠', '{earthy,peppery,subtle}', 'Achiote color + mild earth',                           0, '{latin,mexican,caribbean}', '{rice,chicken,stews,pork}', '{sazon,cumin}', FALSE),
('Epazote',           '🌿', '{pungent,medicinal,earthy}', 'Traditional Mexican bean herb',                     0, '{mexican}', '{beans,soup,quesadillas,tamales}', '{oregano,cumin}', FALSE),
('Savory',            '🌿', '{peppery,thyme-like}', 'Bean herb — summer & winter',                             0, '{french,german}', '{beans,lentils,stuffing,soup,sausage}', '{thyme,sage}', FALSE),
('Chervil',           '🌿', '{mild,anise,parsley-like}', 'Delicate French fines-herbes',                       0, '{french}', '{eggs,salad,chicken,fish,soup}', '{tarragon,parsley}', FALSE),
('Lavender',          '💜', '{floral,perfumed,sweet}', 'Provence floral notes',                                0, '{french}', '{baking,dessert,tea,chicken,lamb}', '{herbes de provence,thyme}', FALSE),
('Chamomile',         '🌼', '{floral,apple-like,calming}', 'Soothing tea flowers',                             0, '{european}', '{tea,dessert,baking}', '{mint,lavender}', FALSE),
('Rose Petals',       '🌹', '{floral,delicate,perfumed}', 'Middle-Eastern dessert floral',                     0, '{middle_eastern,indian}', '{dessert,tea,rice,baking}', '{cardamom,saffron}', FALSE),
('Dill Seed',         '🌱', '{tangy,caraway-like}', 'Pickle-jar backbone',                                     0, '{american,european}', '{pickles,bread,dressings,fish}', '{dill,caraway seed}', FALSE),
('Coriander Seed',    '🌱', '{citrusy,nutty,warm}', 'Whole-seed citrus warmth',                                0, '{indian,middle_eastern}', '{curry,pickles,sausage,beer,stews}', '{cumin,coriander}', FALSE),
('Cumin Seed',        '🌱', '{earthy,smoky,intense}', 'Whole-seed taco soul',                                  1, '{mexican,indian,middle_eastern}', '{chili,curry,rice,beans}', '{cumin,coriander seed}', FALSE),
('Black Cardamom',    '🖤', '{smoky,camphor,bold}', 'Bacon-of-spices smokiness',                               0, '{indian,chinese}', '{curry,biryani,stews,rice,lamb}', '{cardamom,cloves}', FALSE),
('Amchur',            '🥭', '{sour,fruity,mango}', 'Dry mango tang',                                           0, '{indian}', '{curry,lentils,chutney,vegetables}', '{cumin,coriander}', FALSE),
('Asafoetida',        '🧄', '{pungent,oniony,funky}', 'Hing — garlic-onion depth',                             0, '{indian}', '{lentils,curry,vegetables,dal,pickles}', '{cumin,mustard seed}', FALSE),
('Galangal',          '🫚', '{sharp,citrusy,piney}', 'Thai ginger''s sharper cousin',                          1, '{thai,indonesian,asian}', '{tom kha,curry,soup,chicken,fish}', '{lemongrass,ginger}', FALSE),
('Kaffir Lime',       '🍃', '{citrusy,floral,intense}', 'Thai curry-leaf citrus',                              0, '{thai,southeast_asian}', '{curry,soup,chicken,fish,rice}', '{lemongrass,galangal}', FALSE),
('Nutritional Yeast', '🧀', '{cheesy,nutty,umami}', 'Vegan cheese vibes',                                      0, '{american,vegan}', '{pasta,popcorn,vegetables,sauces,soup}', '{garlic powder,onion powder}', FALSE),
('Smoked Salt',       '🧂', '{salty,smoky,intense}', 'Smoke without the fire',                                 0, '{american}', '{bbq,steak,vegetables,eggs,soup}', '{smoked paprika,black pepper}', FALSE),
('Green Cardamom',    '🌰', '{sweet,floral,eucalyptus}', 'The chai spice itself',                              0, '{indian,middle_eastern}', '{curry,rice,tea,coffee,baking,dessert}', '{cinnamon,cloves}', FALSE),
('Onion Flakes',      '🧅', '{sweet,toasty,onion}', 'Toasty onion bits',                                       0, '{american}', '{burgers,soup,dips,meatloaf,vegetables}', '{onion powder,garlic powder}', FALSE),
('Minced Garlic',     '🧄', '{pungent,toasty,garlic}', 'Chunky garlic convenience',                            0, '{universal}', '{chicken,pasta,soup,bread,vegetables}', '{garlic powder,onion flakes}', TRUE),
('Bay Leaves Whole',  '🍃', '{herbal,subtle,floral}', 'Bulk braising leaves',                                  0, '{mediterranean,american}', '{soup,stews,sauce,rice,beans,braising}', '{thyme,black pepper}', FALSE),
('Red Curry Powder',  '🔴', '{warm,spicy,aromatic}', 'Red-hot curry depth',                                    3, '{indian,thai}', '{curry,chicken,rice,vegetables}', '{turmeric,cumin}', FALSE),
('Chinese Mustard',   '🟡', '{sharp,hot,sinus-clearing}', 'Hot-mustard bite',                                  3, '{chinese}', '{egg rolls,duck,pork,sandwiches}', '{mustard powder,horseradish powder}', FALSE),
('Sage Rubbed',       '🌿', '{earthy,velvety,soft}', 'Fluffy rubbed sage',                                     0, '{american,italian}', '{turkey,stuffing,pork,butter sauce}', '{poultry seasoning,thyme}', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED: Additional preset blends (mixing 053 + 057 catalog spices)
-- Idempotent: NOT EXISTS on blend names, ON CONFLICT on ingredients.
-- ============================================================================

INSERT INTO spice_blends (user_id, name, icon, description, dish_tags, source)
SELECT v.user_id, v.name, v.icon, v.description, v.dish_tags, v.source
FROM (VALUES
(NULL::integer, 'Everything Bagel',   '🥯', 'Sesame-garlic bagel topper', '{bagels,bread,eggs,salmon,avocado}'::text[], 'preset'),
(NULL::integer, 'Shawarma Blend',     '🥙', 'Warm Middle-Eastern wrap spice', '{chicken,lamb,beef,wraps,rice}'::text[], 'preset'),
(NULL::integer, 'Jerk Rub',           '🌴', 'Jamaican allspice fire', '{chicken,pork,shrimp,rice,grill}'::text[], 'preset'),
(NULL::integer, 'Fajita Mix',         '🫑', 'Sizzling Tex-Mex fajita dust', '{fajitas,chicken,steak,peppers,onions}'::text[], 'preset'),
(NULL::integer, 'Adobo Mix',          '🧂', 'Latin all-purpose blend', '{chicken,rice,beans,pork,vegetables}'::text[], 'preset'),
(NULL::integer, 'Chai Blend',         '🍵', 'Warming tea & baking spice', '{tea,coffee,dessert,oatmeal,baking}'::text[], 'preset'),
(NULL::integer, 'Steakhouse Rub',     '🥩', 'Coarse crusty steak dust', '{steak,burgers,pork,potatoes,grill}'::text[], 'preset'),
(NULL::integer, 'House Seasoned Salt','🧂', 'Kitchen workhorse finishing salt', '{chicken,vegetables,eggs,fries,soup}'::text[], 'preset')
) AS v(user_id, name, icon, description, dish_tags, source)
WHERE NOT EXISTS (
  SELECT 1 FROM spice_blends b WHERE b.user_id IS NULL AND b.name = v.name
);

INSERT INTO spice_blend_ingredients (blend_id, spice_id, parts, note)
SELECT b.id, s.id, v.parts, v.note
FROM (VALUES
('Everything Bagel',    'Sesame Seed',     2.0, NULL),
('Everything Bagel',    'Poppy Seed',      2.0, NULL),
('Everything Bagel',    'Minced Garlic',   2.0, 'dried works best'),
('Everything Bagel',    'Onion Flakes',    2.0, NULL),
('Everything Bagel',    'Salt',            1.5, 'flaky if you have it'),

('Shawarma Blend',      'Cumin',           2.0, 'earthy core'),
('Shawarma Blend',      'Coriander',       2.0, NULL),
('Shawarma Blend',      'Turmeric',        1.0, 'color'),
('Shawarma Blend',      'Paprika',         1.5, NULL),
('Shawarma Blend',      'Garlic Powder',   1.0, NULL),
('Shawarma Blend',      'Cinnamon',        0.5, 'warmth'),
('Shawarma Blend',      'Cayenne',         0.5, 'to taste'),
('Shawarma Blend',      'Black Pepper',    0.5, NULL),

('Jerk Rub',            'Allspice',        2.0, 'the signature'),
('Jerk Rub',            'Thyme',           2.0, NULL),
('Jerk Rub',            'Cayenne',         1.0, 'scotch bonnet stand-in'),
('Jerk Rub',            'Garlic Powder',   1.0, NULL),
('Jerk Rub',            'Onion Powder',    1.0, NULL),
('Jerk Rub',            'Salt',            1.0, NULL),
('Jerk Rub',            'Black Pepper',    1.0, NULL),
('Jerk Rub',            'Nutmeg',          0.5, NULL),
('Jerk Rub',            'Cinnamon',        0.5, NULL),

('Fajita Mix',          'Chili Powder',    3.0, 'the base'),
('Fajita Mix',          'Cumin',           2.0, NULL),
('Fajita Mix',          'Paprika',         1.5, NULL),
('Fajita Mix',          'Garlic Powder',   1.0, NULL),
('Fajita Mix',          'Onion Powder',    1.0, NULL),
('Fajita Mix',          'Oregano',         0.5, 'Mexican oregano if you have it'),
('Fajita Mix',          'Cayenne',         0.25, 'optional heat'),

('Adobo Mix',           'Garlic Powder',   3.0, 'dominant'),
('Adobo Mix',           'Onion Powder',    2.0, NULL),
('Adobo Mix',           'Oregano',         2.0, NULL),
('Adobo Mix',           'Cumin',           1.0, NULL),
('Adobo Mix',           'Black Pepper',    1.0, NULL),
('Adobo Mix',           'Turmeric',        0.5, 'color'),

('Chai Blend',          'Green Cardamom',  3.0, 'the star'),
('Chai Blend',          'Cinnamon',        3.0, NULL),
('Chai Blend',          'Ginger',          2.0, NULL),
('Chai Blend',          'Cloves',          1.0, NULL),
('Chai Blend',          'Black Pepper',    0.5, 'bite'),
('Chai Blend',          'Star Anise',      0.5, 'licorice note'),

('Steakhouse Rub',      'Black Pepper',    3.0, 'coarse ground'),
('Steakhouse Rub',      'Garlic Powder',   2.0, NULL),
('Steakhouse Rub',      'Onion Flakes',    2.0, NULL),
('Steakhouse Rub',      'Paprika',         1.0, NULL),
('Steakhouse Rub',      'Coriander Seed',  1.0, 'cracked'),
('Steakhouse Rub',      'Dill Seed',       0.5, NULL),
('Steakhouse Rub',      'Cayenne',         0.5, 'optional'),

('House Seasoned Salt', 'Salt',            4.0, 'the carrier'),
('House Seasoned Salt', 'Paprika',         1.0, NULL),
('House Seasoned Salt', 'Garlic Powder',   1.0, NULL),
('House Seasoned Salt', 'Onion Powder',    1.0, NULL),
('House Seasoned Salt', 'Black Pepper',    0.5, NULL),
('House Seasoned Salt', 'Celery Seed',     0.25, 'subtle depth')
) AS v(blend_name, spice_name, parts, note)
JOIN spice_blends b ON b.user_id IS NULL AND b.name = v.blend_name
JOIN spices s ON s.name = v.spice_name
ON CONFLICT (blend_id, spice_id) DO NOTHING;
