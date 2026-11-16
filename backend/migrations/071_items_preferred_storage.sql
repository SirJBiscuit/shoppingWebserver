-- Items preferred storage location
-- Lets a trained item carry a default storage location (fridge / pantry /
-- freezer / custom) so new inventory rows land in the right spot and the
-- Lab List trainer can teach location alongside icon, category, and price.

ALTER TABLE items ADD COLUMN IF NOT EXISTS preferred_storage_location VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_items_storage_location
  ON items(preferred_storage_location)
  WHERE preferred_storage_location IS NOT NULL;
