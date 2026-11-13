-- ============================================================================
-- 062: Changelog admin enhancements
--   priority  — 'low' | 'medium' | 'high' badge shown in admin + viewer
--   sort_order — admin drag-sort for upcoming features
--   is_hidden  — soft-hide an entry without deleting it
-- ============================================================================

ALTER TABLE changelog_features ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';
ALTER TABLE changelog_features ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE changelog_features ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Backfill a stable order for existing rows (oldest first gets lowest order).
UPDATE changelog_features
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM changelog_features
) sub
WHERE changelog_features.id = sub.id AND changelog_features.sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_changelog_features_upcoming_order
  ON changelog_features(status, is_hidden, sort_order);
