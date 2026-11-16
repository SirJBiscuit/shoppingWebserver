-- Migration 088: poll icons + private admin ideas board
--
-- 1) beta_feature_polls.icon — optional lucide icon key shown on the poll.
-- 2) beta_admin_ideas — private admin scratchboard in the admin viewer:
--    ideas/tasks/notes with tag, status, pin, and color. Admin-only.

ALTER TABLE beta_feature_polls
  ADD COLUMN IF NOT EXISTS icon VARCHAR(30);

CREATE TABLE IF NOT EXISTS beta_admin_ideas (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  tag VARCHAR(20) NOT NULL DEFAULT 'idea',    -- idea|task|note|plan|investigate|risk
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open|in_progress|done|archived
  is_pinned BOOLEAN DEFAULT FALSE,
  color VARCHAR(20),                          -- accent for title text
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_beta_admin_ideas_order
  ON beta_admin_ideas(is_pinned DESC, created_at DESC);
