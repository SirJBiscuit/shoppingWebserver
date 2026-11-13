-- 067: Changelog voting + progress tracking
-- Beta testers (and all signed-in users) can vote on upcoming features;
-- admins set a 0-100 progress value shown as a bar on in-progress items.

ALTER TABLE changelog_features
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE changelog_features
  ADD COLUMN IF NOT EXISTS voting_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS changelog_feature_votes (
  id SERIAL PRIMARY KEY,
  feature_id INTEGER NOT NULL REFERENCES changelog_features(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (feature_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_changelog_votes_feature ON changelog_feature_votes(feature_id);
CREATE INDEX IF NOT EXISTS idx_changelog_votes_user ON changelog_feature_votes(user_id);
