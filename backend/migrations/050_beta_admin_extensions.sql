-- Migration 050: Beta admin extensions
-- Per-tester access expiry, suspension, and admin notes.

ALTER TABLE beta_testers ADD COLUMN IF NOT EXISTS beta_expires_at TIMESTAMP;
ALTER TABLE beta_testers ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT false;
ALTER TABLE beta_testers ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_beta_testers_expiry ON beta_testers(beta_expires_at);
CREATE INDEX IF NOT EXISTS idx_beta_testers_suspended ON beta_testers(suspended);

COMMENT ON COLUMN beta_testers.beta_expires_at IS 'When this tester''s beta access ends (NULL = no expiry)';
COMMENT ON COLUMN beta_testers.suspended IS 'Suspended testers cannot submit feedback or use beta features';
COMMENT ON COLUMN beta_testers.admin_notes IS 'Private admin notes about this tester';

-- Beta codes: allow admins to rename codes (still unique)
CREATE INDEX IF NOT EXISTS idx_beta_testers_code_fk ON beta_testers(beta_code_id);
