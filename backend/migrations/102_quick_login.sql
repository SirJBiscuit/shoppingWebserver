-- Quick login (admin): shuffled-symbol partial challenge + one-time backup codes.
-- The secret sequence is AES-256-GCM encrypted in users.quick_seq (key derived
-- server-side from QUICK_LOGIN_SECRET || JWT_SECRET) because partial-position
-- challenges need the plaintext positions — bcrypt can't verify a subset.
-- One-time codes are bcrypt hashes; they burn on use.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_seq TEXT,
  ADD COLUMN IF NOT EXISTS quick_failed INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quick_locked_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS quick_login_codes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_login_codes_user
  ON quick_login_codes(user_id) WHERE used_at IS NULL;
