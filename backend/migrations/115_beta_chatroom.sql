-- Beta chatroom — shared room for admins + beta testers, plus a per-tester
-- chat gate (can_chat) so admins control who can talk.

CREATE TABLE IF NOT EXISTS beta_chatroom_messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  deleted_by  INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_beta_chatroom_created ON beta_chatroom_messages(created_at);

ALTER TABLE beta_testers ADD COLUMN IF NOT EXISTS can_chat BOOLEAN NOT NULL DEFAULT TRUE;
