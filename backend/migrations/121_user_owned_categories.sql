-- User-owned categories — custom categories save to the creator's
-- account (user_id) instead of being globally visible. NULL user_id =
-- system/global category visible to everyone. Items reference category
-- names (not FK ids), so deleting a private category never orphans rows.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
