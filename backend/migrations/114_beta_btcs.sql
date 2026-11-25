-- ============================================================================
-- 114: Beta Tester Contribution System (BTCS)
--
-- Admin-only XP layer for beta testers. The score itself is computed from
-- the contribution tables that already exist (feedback, pins, MDL items,
-- prices, aisle reports, poll votes, recipes) — this migration adds the
-- state that can't be derived:
--
--   beta_testers.pin_limit   — per-tester pin cap override (NULL = tier default)
--   beta_testers.score_bonus — discretionary points an admin can grant/dock
--   beta_tester_feature_overrides — per-tester feature grants/revokes that
--     sit above the global feature_flags
-- ============================================================================

ALTER TABLE beta_testers
  ADD COLUMN IF NOT EXISTS pin_limit INTEGER CHECK (pin_limit IS NULL OR pin_limit >= 0),
  ADD COLUMN IF NOT EXISTS score_bonus INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS beta_tester_feature_overrides (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  allowed BOOLEAN NOT NULL,
  granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_btfo_user ON beta_tester_feature_overrides(user_id);

COMMENT ON TABLE beta_tester_feature_overrides IS 'Per-tester feature grants (allowed=true) and revokes (allowed=false) layered over global feature_flags';
COMMENT ON COLUMN beta_testers.pin_limit IS 'Open pins allowed per page; NULL = tier default (30)';
COMMENT ON COLUMN beta_testers.score_bonus IS 'Admin-granted BTCS points — reward or penalty';
