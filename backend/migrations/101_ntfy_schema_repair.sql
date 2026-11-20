-- Migration 101: ntfy schema repair (defensive)
-- Prod has historically run partially-migrated schemas. If 097/099 only
-- half-applied, every user-side ntfy query silently fails and only the
-- admin topic (beta_signup) appears to work. Re-assert everything the
-- service touches; every statement is idempotent.

CREATE TABLE IF NOT EXISTS ntfy_user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(200) DEFAULT '',
    enabled BOOLEAN DEFAULT FALSE,
    types JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_expiry_alert_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ntfy_user_settings ADD COLUMN IF NOT EXISTS topic VARCHAR(200) DEFAULT '';
ALTER TABLE ntfy_user_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE ntfy_user_settings ADD COLUMN IF NOT EXISTS types JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE ntfy_user_settings ADD COLUMN IF NOT EXISTS last_expiry_alert_at TIMESTAMPTZ;
ALTER TABLE ntfy_user_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE ntfy_user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS ntfy_admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    topic VARCHAR(200) DEFAULT '',
    enabled BOOLEAN DEFAULT FALSE,
    types JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ntfy_admin_settings ADD COLUMN IF NOT EXISTS topic VARCHAR(200) DEFAULT '';
ALTER TABLE ntfy_admin_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE ntfy_admin_settings ADD COLUMN IF NOT EXISTS types JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE ntfy_admin_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE ntfy_admin_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO ntfy_admin_settings (id, enabled)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ntfy_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL DEFAULT 'user',
  type VARCHAR(50),
  title TEXT,
  message TEXT,
  delivered BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ntfy_notifications ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE ntfy_notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE ntfy_notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ntfy_notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE ntfy_notifications ADD COLUMN IF NOT EXISTS delivered BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ntfy_notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_ntfy_notifications_user ON ntfy_notifications(user_id, sent_at DESC);
