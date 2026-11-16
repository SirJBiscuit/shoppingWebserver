-- Migration 073: MDL quality-gate community votes
-- denials let the community flag bad pending items, not just confirm good
-- ones. 3 distinct denials => auto-reject + name stays flagged.

ALTER TABLE mdl_review_queue
  ADD COLUMN IF NOT EXISTS denied_users INTEGER[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS denials INTEGER DEFAULT 0;
