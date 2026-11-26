-- Shared icons — users can donate uploaded item icons to the global
-- pool; they show for everyone once an admin approves them.
-- shared_status: 'local' (default, private) | 'pending' | 'approved' | 'rejected'
ALTER TABLE images ADD COLUMN IF NOT EXISTS shared_status VARCHAR(20) DEFAULT 'local';
ALTER TABLE images ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP;
ALTER TABLE images ADD COLUMN IF NOT EXISTS shared_approved_by INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_images_shared ON images(shared_status) WHERE shared_status <> 'local';
