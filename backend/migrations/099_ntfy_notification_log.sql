-- Migration 099: ntfy send log
-- The service is fire-and-forget, so there was no way to see what the app
-- actually pushed. This log backs the floating ntfy panel's "recent" feed.
CREATE TABLE IF NOT EXISTS ntfy_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  type VARCHAR(50),                           -- expiry | feature_release | broadcast | changelog | beta_signup | beta_feedback | test
  title TEXT,
  message TEXT,
  delivered BOOLEAN NOT NULL DEFAULT false,   -- did ntfy.sh accept it
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ntfy_notifications_user ON ntfy_notifications(user_id, sent_at DESC);
