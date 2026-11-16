-- Migration 082: beta_pins schema repair
--
-- CREATE TABLE IF NOT EXISTS (074) never updates an existing table, so any
-- database that had beta_pins created by an earlier shape is missing newer
-- columns and/or carries a stale CHECK constraint on `status` (e.g. one
-- that doesn't allow 'in_progress'). That makes every admin status update
-- 500. This repair adds every column the code touches and rebuilds the
-- severity/status CHECKs with the full allowed sets.

-- 1. Every column any route or feature reads/writes.
ALTER TABLE beta_pins
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS resolved_by INTEGER,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS element_selector TEXT,
  ADD COLUMN IF NOT EXISTS offset_x NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS offset_y NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS element_label VARCHAR(300),
  ADD COLUMN IF NOT EXISTS viewport VARCHAR(30),
  ADD COLUMN IF NOT EXISTS icon VARCHAR(30) NOT NULL DEFAULT 'pin';

-- 2. FK on resolved_by (idempotent — skip if a constraint already covers it).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'beta_pins'::regclass
      AND confrelid = 'users'::regclass
      AND conname LIKE 'beta_pins_resolved_by%'
  ) THEN
    ALTER TABLE beta_pins
      ADD CONSTRAINT beta_pins_resolved_by_fkey
      FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Rebuild CHECK constraints with the full allowed value sets.
--    Drop every existing CHECK on the table (only status/severity exist)
--    then recreate both — stale CHECKs are what 500 the status endpoint.
DO $$
DECLARE con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'beta_pins' AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE beta_pins DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE beta_pins
  ADD CONSTRAINT beta_pins_status_check
    CHECK (status IN ('open','in_progress','fixed','hidden','removed')),
  ADD CONSTRAINT beta_pins_severity_check
    CHECK (severity IN ('critical','annoying','minor','weird'));
