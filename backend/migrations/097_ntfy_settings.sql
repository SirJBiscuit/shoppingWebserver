-- Migration 097: ntfy.sh notification settings
-- Per-user ntfy topics + per-type toggles, plus a single admin alert config.

-- Per-user ntfy configuration. A user opts in by setting a topic they've
-- subscribed to in the ntfy app; per-type toggles live in `types` JSONB.
CREATE TABLE IF NOT EXISTS ntfy_user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(200) DEFAULT '',
    enabled BOOLEAN DEFAULT FALSE,
    -- { "expiry": true, "feature_release": true, "broadcast": true }
    types JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- dedupe window for recurring alerts (e.g. daily expiry digest)
    last_expiry_alert_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Single-row admin alert configuration. Per-type toggles in `types` JSONB.
CREATE TABLE IF NOT EXISTS ntfy_admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    topic VARCHAR(200) DEFAULT '',
    enabled BOOLEAN DEFAULT FALSE,
    -- { "changelog": true, "beta_signup": true, "beta_feedback": true }
    types JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ntfy_admin_settings (id, enabled)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;
