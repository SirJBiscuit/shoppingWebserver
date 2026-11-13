-- ============================================================================
-- 058: MDL product enhancements
--
-- Adds to the MDL product system:
--   1. product_master_data: aisle, brand, is_best columns
--   2. mdl_size_presets: admin-manageable size/weight/unit presets with
--      simple labels and colors (e.g. "Amount per package")
--   3. mdl_product_variants: per-store sub-entries so MDL can learn
--      aisle/price/best-version per store location
--   4. mdl_item_favorites: household-member favorite/hated marks for any
--      entity type (item, brand, ingredient, meal, restaurant)
-- ============================================================================

-- 1. Product columns ---------------------------------------------------------
ALTER TABLE product_master_data
  ADD COLUMN IF NOT EXISTS aisle VARCHAR(50),
  ADD COLUMN IF NOT EXISTS brand VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_best BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_mdl_product_brand ON product_master_data(brand);
CREATE INDEX IF NOT EXISTS idx_mdl_product_is_best ON product_master_data(is_best) WHERE is_best = TRUE;

-- 2. Size/weight/unit presets ------------------------------------------------
CREATE TABLE IF NOT EXISTS mdl_size_presets (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),                 -- canonical category or NULL = applies to all
  preset_type VARCHAR(30) NOT NULL DEFAULT 'size',  -- 'size', 'weight', 'unit', 'package'
  label VARCHAR(100) NOT NULL,           -- simple display name e.g. "Amount per package"
  value VARCHAR(100) NOT NULL,           -- stored value e.g. "16oz", "1lb", "per lb"
  sort_order INTEGER DEFAULT 0,
  color VARCHAR(30),                     -- tailwind-ish color key: blue/green/red/amber/purple/gray
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (category, preset_type, value)
);

-- Sensible defaults
INSERT INTO mdl_size_presets (category, preset_type, label, value, sort_order, color) VALUES
  -- Weights (meat/deli focus)
  ('Meat & Seafood', 'weight', 'Per pound', 'per lb', 1, 'red'),
  ('Meat & Seafood', 'weight', 'Half pound pack', '0.5 lb', 2, 'red'),
  ('Meat & Seafood', 'weight', 'One pound pack', '1 lb', 3, 'red'),
  ('Meat & Seafood', 'weight', 'Two pound pack', '2 lb', 4, 'red'),
  ('Meat & Seafood', 'weight', 'Family pack (3 lb)', '3 lb', 5, 'red'),
  ('Meat & Seafood', 'weight', 'Bulk pack (5 lb)', '5 lb', 6, 'red'),
  -- Package counts
  (NULL, 'package', 'Amount per package', 'per package', 10, 'blue'),
  (NULL, 'package', 'Each / single item', 'each', 11, 'blue'),
  (NULL, 'package', 'Six pack', '6 pack', 12, 'blue'),
  (NULL, 'package', 'Twelve pack', '12 pack', 13, 'blue'),
  (NULL, 'package', 'Case (24)', '24 pack', 14, 'blue'),
  -- Common sizes
  (NULL, 'size', 'Small', 'small', 20, 'green'),
  (NULL, 'size', 'Medium', 'medium', 21, 'green'),
  (NULL, 'size', 'Large', 'large', 22, 'green'),
  (NULL, 'size', 'Family size', 'family size', 23, 'green'),
  -- Liquid units
  ('Beverages', 'unit', 'Fluid ounces', 'fl oz', 30, 'cyan'),
  ('Beverages', 'unit', 'Liters', 'L', 31, 'cyan'),
  ('Dairy & Eggs', 'unit', 'Gallons', 'gal', 32, 'cyan'),
  ('Dairy & Eggs', 'unit', 'Half gallon', 'half gal', 33, 'cyan'),
  ('Dairy & Eggs', 'unit', 'Dozen', 'dozen', 34, 'cyan'),
  -- Generic units
  (NULL, 'unit', 'Ounces (oz)', 'oz', 40, 'gray'),
  (NULL, 'unit', 'Pounds (lb)', 'lb', 41, 'gray'),
  (NULL, 'unit', 'Grams (g)', 'g', 42, 'gray'),
  (NULL, 'unit', 'Count (ct)', 'ct', 43, 'gray'),
  (NULL, 'unit', 'Bag', 'bag', 44, 'gray'),
  (NULL, 'unit', 'Box', 'box', 45, 'gray'),
  (NULL, 'unit', 'Can', 'can', 46, 'gray'),
  (NULL, 'unit', 'Jar', 'jar', 47, 'gray'),
  (NULL, 'unit', 'Bottle', 'bottle', 48, 'gray'),
  (NULL, 'unit', 'Rolls', 'rolls', 49, 'gray')
ON CONFLICT DO NOTHING;

-- 3. Per-store product variants ----------------------------------------------
-- One product can exist at many stores with different aisle/price/best status.
CREATE TABLE IF NOT EXISTS mdl_product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES product_master_data(id) ON DELETE CASCADE,
  store_name VARCHAR(255) NOT NULL,
  aisle VARCHAR(50),
  price DECIMAL(10,2),
  size_value VARCHAR(50),      -- which size/weight this variant covers
  is_best BOOLEAN DEFAULT FALSE,  -- "best version" of this product at this store
  notes TEXT,
  times_reported INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, store_name, size_value)
);

CREATE INDEX IF NOT EXISTS idx_mdl_variants_product ON mdl_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_mdl_variants_store ON mdl_product_variants(store_name);

-- 4. Household-member favorites ----------------------------------------------
-- Right-click "whose favorite?" works for items, brands, ingredients,
-- meals and restaurants via entity_type.
CREATE TABLE IF NOT EXISTS mdl_item_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES household_members(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL DEFAULT 'item',   -- item|brand|ingredient|meal|restaurant
  entity_name VARCHAR(255) NOT NULL,
  product_id INTEGER REFERENCES product_master_data(id) ON DELETE SET NULL,
  preference VARCHAR(20) NOT NULL,                   -- 'favorite', 'like', 'hated'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, member_id, entity_type, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_mdl_favorites_lookup
  ON mdl_item_favorites(user_id, entity_type, entity_name);
