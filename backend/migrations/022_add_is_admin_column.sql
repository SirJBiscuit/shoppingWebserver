-- Add is_admin column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Make the first user an admin (if exists)
UPDATE users SET is_admin = true WHERE id = 1;

COMMENT ON COLUMN users.is_admin IS 'Whether this user has admin privileges';
