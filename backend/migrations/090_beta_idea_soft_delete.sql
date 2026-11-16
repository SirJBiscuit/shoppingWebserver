-- Migration 090: soft-delete for the private admin ideas board
--
-- deleted_at — set by DELETE /api/beta/ideas/admin/:id instead of removing
-- the row, so deleted ideas can be recovered from the Admin Viewer
-- history tab. NULL = live idea.

ALTER TABLE beta_admin_ideas
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_beta_admin_ideas_deleted
  ON beta_admin_ideas(deleted_at ASC NULLS FIRST);
