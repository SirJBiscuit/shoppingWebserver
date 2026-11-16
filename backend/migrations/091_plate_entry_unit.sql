-- ============================================================================
-- 091: Plate entry units
--
-- Plate Lab entries previously logged only a bare "servings" number. Adding a
-- unit column lets entries record what the number means (serving, cup, piece,
-- grams...) — display-only for now; scoring still uses the servings value.
-- ============================================================================

ALTER TABLE plate_entries ADD COLUMN IF NOT EXISTS unit VARCHAR(30) DEFAULT 'serving';
