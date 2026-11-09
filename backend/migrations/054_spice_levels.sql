-- ============================================================================
-- 054: Spice container levels + sizing for the spice rack
--
-- level_percent: 0-100 how full the user's container is
-- container_tsp: capacity of the user's container in teaspoons
--   (standard supermarket jar ≈ 12 tsp / 2oz — used to estimate whether
--    the user has enough of a spice to make a blend)
-- ============================================================================

ALTER TABLE user_spice_rack
  ADD COLUMN IF NOT EXISTS level_percent SMALLINT NOT NULL DEFAULT 100
    CHECK (level_percent BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS container_tsp NUMERIC(6,1) NOT NULL DEFAULT 12;

-- Existing rack rows become "full" containers
UPDATE user_spice_rack SET level_percent = 100 WHERE level_percent IS NULL;
