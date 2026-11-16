-- Migration 089: priority queue for the private admin ideas board
--
-- priority_rank — set by the Admin Viewer right-click "Prioritize" action.
-- The FIRST idea prioritized gets rank 1 (highest); every later prioritize
-- takes MAX+1, so ranks read as an ordered queue (P1, P2, P3…).
-- NULL = not prioritized.

ALTER TABLE beta_admin_ideas
  ADD COLUMN IF NOT EXISTS priority_rank INTEGER;

CREATE INDEX IF NOT EXISTS idx_beta_admin_ideas_priority
  ON beta_admin_ideas(priority_rank ASC NULLS LAST);
