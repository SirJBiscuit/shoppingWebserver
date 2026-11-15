-- Estimated "full" quantity per inventory row so the UI can show % left
-- (current_quantity / estimated_quantity * 100). Used by Lab Pantry Picker.

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS estimated_quantity NUMERIC;

COMMENT ON COLUMN inventory.estimated_quantity IS 'User-estimated full/starting amount; combined with current_quantity to compute percentage remaining';
