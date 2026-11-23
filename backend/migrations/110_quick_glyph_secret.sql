-- Second pad secret: the glyph drawn on the glyph pad is its own bcrypt
-- credential, independent of the bubble-pad PIN. /verify accepts either,
-- so each pad keeps its own muscle-memory shape.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_glyph TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_glyph_len INTEGER;
