-- Migration 074: Beta pin annotations + feedback reply threads + queue notes
--
-- beta_pins: testers drop a pin anywhere on any page with a severity badge
-- and a note; admins triage (open → in_progress → fixed), hide, or remove.
-- beta_feedback_replies: turns the one-shot admin_response into a real
-- back-and-forth thread between tester and admin.
-- mdl_review_queue.notes: community comments on quarantined submissions —
-- advisory context for the admin, not decisions.

CREATE TABLE IF NOT EXISTS beta_pins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  page_path VARCHAR(255) NOT NULL,              -- e.g. '/', '/pantry', '/lab/mix'
  x_pct NUMERIC(5,2) NOT NULL,                  -- viewport % position (0-100)
  y_pct NUMERIC(5,2) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'minor' -- critical | annoying | minor | weird
    CHECK (severity IN ('critical','annoying','minor','weird')),
  note TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open'    -- open | in_progress | fixed | hidden | removed
    CHECK (status IN ('open','in_progress','fixed','hidden','removed')),
  admin_note TEXT,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_beta_pins_page ON beta_pins(page_path, status);
CREATE INDEX IF NOT EXISTS idx_beta_pins_user ON beta_pins(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS beta_feedback_replies (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER REFERENCES beta_feedback(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_replies_fid
  ON beta_feedback_replies(feedback_id, created_at);

ALTER TABLE mdl_review_queue
  ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;
