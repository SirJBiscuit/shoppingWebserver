-- Migration 048: MDL hardening
-- - Image columns on mdl_item_names so uploaded product images attach to items
-- - Defensive store_locations columns (earlier migrations may have created
--   the table with a different shape before 040 ran)

ALTER TABLE mdl_item_names
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE store_locations
  ADD COLUMN IF NOT EXISTS chain_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS store_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS store_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS state VARCHAR(2),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS metro_area VARCHAR(100),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backup tracking (who/when/file) for admin visibility
CREATE TABLE IF NOT EXISTS mdl_backup_log (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  table_counts JSONB DEFAULT '{}'::jsonb,
  created_by VARCHAR(50) DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
