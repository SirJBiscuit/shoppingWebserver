-- Migration 072: MDL Data Quality Gate
-- Turns mdl_review_queue into a real quarantine: suspect submissions wait
-- there (flagged, scored, deduped) and only verified data reaches
-- product_master_data or the global autocomplete tier.
--
-- Auto-confirmation: when 2+ DISTINCT users submit the same pending name it
-- self-promotes to the catalog — good data gets in fast without admin work.

-- 1. Quarantine columns on the existing review queue
ALTER TABLE mdl_review_queue
  ADD COLUMN IF NOT EXISTS normalized_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS icon_emoji VARCHAR(10),
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'track_item',
  ADD COLUMN IF NOT EXISTS quality_score INTEGER,
  ADD COLUMN IF NOT EXISTS flags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmations INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS confirmed_users INTEGER[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS promoted_product_id INTEGER;

-- status now supports: pending | approved | rejected | auto_confirmed | blocked

CREATE INDEX IF NOT EXISTS idx_mdl_review_queue_normalized
  ON mdl_review_queue(normalized_name, status);
CREATE INDEX IF NOT EXISTS idx_mdl_review_queue_pending
  ON mdl_review_queue(status, quality_score DESC, created_at DESC)
  WHERE status = 'pending';

-- 2. Flag junk names so they never reach the global autocomplete tier
ALTER TABLE mdl_item_names
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_mdl_item_names_flagged
  ON mdl_item_names(is_flagged) WHERE is_flagged = TRUE;

-- 3. Hard blocklist — rejected names never re-enter the pipeline
CREATE TABLE IF NOT EXISTS mdl_blocked_names (
  normalized_name VARCHAR(255) PRIMARY KEY,
  reason VARCHAR(100),
  blocked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
