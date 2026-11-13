-- ============================================================================
-- 051: Changelog, user notifications, MDL review queue, beta feature gating
-- ============================================================================

-- 1. Beta-tester gating on feature flags (admin hides a feature from beta testers)
--    feature_flags comes from 020 (not in every deploy list) — if it's absent
--    or shaped differently, skip the flag work rather than roll back the
--    tables below.
DO $$
BEGIN
  IF to_regclass('feature_flags') IS NOT NULL THEN
    ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS hide_from_beta BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 2. Changelog features — admin-managed roadmap entries shown to all users.
--    status: 'planned' | 'in_progress' | 'released'
CREATE TABLE IF NOT EXISTS changelog_features (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(30) DEFAULT 'feature',       -- feature | improvement | fix | beta
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  target_date DATE,                             -- rough ETA shown to users
  released_at TIMESTAMP,
  beta_only BOOLEAN DEFAULT FALSE,              -- only beta testers see/get notified
  notify_on_release BOOLEAN DEFAULT TRUE,       -- push user_notifications on release
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_changelog_features_status ON changelog_features(status, created_at DESC);

-- 3. Per-user notifications (release announcements, admin messages)
--    is_read is per-user here, unlike global system_notifications.
CREATE TABLE IF NOT EXISTS user_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'info',      -- feature_release | announcement | admin
  title VARCHAR(200) NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON user_notifications(created_at DESC);

-- 4. MDL review queue — price-learning submissions the system can't handle
--    cleanly (weird names, absurd prices) wait here for an admin decision.
CREATE TABLE IF NOT EXISTS mdl_review_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  raw_name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2),
  store VARCHAR(150),
  reason VARCHAR(50) NOT NULL,                   -- long_name | no_letters | excessive_digits | special_chars | extreme_price
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  corrected_name VARCHAR(255),                   -- admin-provided clean name
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mdl_review_queue_status ON mdl_review_queue(status, created_at DESC);

-- Older seeds may not have feature_key unique — ON CONFLICT below needs it.
DO $$
BEGIN
  IF to_regclass('feature_flags') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'feature_key')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'feature_flags_feature_key_key'
     ) THEN
    BEGIN
      ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_feature_key_key UNIQUE (feature_key);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 5. Seed feature flags for the new/ungated surfaces.
--    console_viewer + clear_cache are hidden from beta testers by default —
--    the admin can flip hide_from_beta in Feature Management.
DO $$
BEGIN
  IF to_regclass('feature_flags') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'min_tier')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'feature_flags' AND column_name = 'hide_from_beta')
  THEN
    INSERT INTO feature_flags (feature_key, feature_name, description, category, min_tier, is_enabled, hide_from_beta, display_order)
    VALUES
      ('console_viewer',  'Console Viewer',   'On-device debug console',        'tools',    'guest', TRUE, TRUE,  90),
      ('clear_cache',     'Clear Cache',      'Clear cached app data button',   'tools',    'guest', TRUE, FALSE, 91),
      ('notepad',         'Notepad',          'Floating notes workspace',       'tools',    'guest', TRUE, FALSE, 92),
      ('price_learning',  'Learn Prices',     'Quick price-learning popup',     'tools',    'guest', TRUE, FALSE, 93),
      ('changelog',       'Changelog',        'Release notes & roadmap viewer', 'system',   'guest', TRUE, FALSE, 94),
      ('notifications',   'Notifications',    'Toolbar notification bell',      'system',   'guest', TRUE, FALSE, 95)
    ON CONFLICT (feature_key) DO NOTHING;
  END IF;
END $$;
