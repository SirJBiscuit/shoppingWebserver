-- Migration 075: Beta feature polls + private admin pins
--
-- beta_feature_polls: admin posts upcoming features/ideas; beta testers vote
-- yes/no (+optional note) so the admin sees demand before building.
-- beta_pins.is_private: admin-created pins can be private reminders visible
-- only to admins (e.g. "rework this layout"), hidden from testers.

ALTER TABLE beta_pins
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS beta_feature_polls (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','planned','released','declined')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beta_feature_poll_votes (
  poll_id INTEGER REFERENCES beta_feature_polls(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('yes','no')),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_beta_feature_polls_status
  ON beta_feature_polls(status, created_at DESC);
