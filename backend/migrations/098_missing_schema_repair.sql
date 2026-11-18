-- Migration 098: Repair pass for objects referenced by current routes but
-- absent on databases where earlier migrations were skipped or partially
-- applied (seen as production 500s on /api/images, /api/mdl/price,
-- /api/mdl/store-usuals and /api/recipes/can-make/check).

-- 1. images — created only by the optional schema-v2 full-schema script,
--    never by an incremental migration. Required by /api/images routes.
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  image_type VARCHAR(50) NOT NULL,
  related_id INTEGER,
  ai_labels JSONB,
  file_size INTEGER,
  mime_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_images_user_type ON images(user_id, image_type);

-- 2. mdl_item_names — prediction columns used by /mdl/autocomplete,
--    /mdl/store-usuals and /mdl/track-item.
--    predicted_icon was VARCHAR(10) in 040 (emoji-only); uploaded icon
--    URLs are longer, so widen it to TEXT — ADD COLUMN keeps VARCHAR(10)
--    on fresh installs otherwise and URL icons would silently fail.
ALTER TABLE mdl_item_names ADD COLUMN IF NOT EXISTS predicted_category VARCHAR(100);
ALTER TABLE mdl_item_names ADD COLUMN IF NOT EXISTS predicted_icon TEXT;
ALTER TABLE mdl_item_names ALTER COLUMN predicted_icon TYPE TEXT;
ALTER TABLE mdl_item_names ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE mdl_item_names ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 3. recipes.in_recipe_book — gated by /recipes/can-make/check.
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS in_recipe_book BOOLEAN DEFAULT true;

-- 4. mdl_user_preferences — used by /mdl/preferences and autocomplete opt-out.
CREATE TABLE IF NOT EXISTS mdl_user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, preference_key)
);
