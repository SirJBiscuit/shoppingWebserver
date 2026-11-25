-- Migration 116: global beta feature default + backup settings + ACH limbo

-- Per-feature global default for beta testers: NULL = normal rules
-- (hide_from_beta/tier), TRUE = granted to every beta tester,
-- FALSE = denied to every beta tester. Per-tester overrides still win.
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS beta_default BOOLEAN;

-- ACH Customization fully shelved — code moved to backburner.
UPDATE feature_flags SET is_limbo = TRUE WHERE feature_key = 'ach_customization';

-- Automatic beta backup scheduler settings (single-row table).
CREATE TABLE IF NOT EXISTS beta_backup_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  interval_minutes INTEGER NOT NULL DEFAULT 1440,
  directory TEXT,
  keep INTEGER NOT NULL DEFAULT 20,
  last_run_at TIMESTAMPTZ
);
INSERT INTO beta_backup_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS beta_backup_log (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  table_counts JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
