-- Quick login challenge mode: 'partial' asks for a few random positions of
-- the secret sequence (shoulder-surf safe); 'full' asks for every position
-- in order — the admin enters the whole sequence from memory.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_login_mode TEXT NOT NULL DEFAULT 'partial';
