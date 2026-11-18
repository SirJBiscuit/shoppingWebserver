-- Beta instant messaging: two-way direct messages between admins and beta
-- testers. Powers /api/beta/messages (polled by the frontend every ~3s).
CREATE TABLE IF NOT EXISTS beta_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 2000),
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_messages_thread
  ON beta_messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at);
CREATE INDEX IF NOT EXISTS idx_beta_messages_recipient_unread
  ON beta_messages (recipient_id) WHERE read_at IS NULL;

COMMENT ON TABLE beta_messages IS 'Direct messages between admins and beta testers (instant chat)';
