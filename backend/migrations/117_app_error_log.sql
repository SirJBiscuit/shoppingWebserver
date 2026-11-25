-- Migration 117: app-wide error log for admin diagnostics + recovery
CREATE TABLE IF NOT EXISTS app_error_log (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'server',   -- server | route | client | process
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT,                                -- request path or client route
  method TEXT,
  user_id INTEGER,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_error_log_created ON app_error_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_log_user ON app_error_log (user_id);

-- Integrity checksum on beta backups (table created in 116)
ALTER TABLE beta_backup_log ADD COLUMN IF NOT EXISTS sha256 TEXT;
