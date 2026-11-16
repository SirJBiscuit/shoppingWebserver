-- Migration 085: normalize beta_pins status/severity/kind to varchar
--
-- Production error: "inconsistent types deduced for parameter $2" on the
-- admin status update — proof that on this database `status` is a real
-- Postgres ENUM type, not a varchar + CHECK like the migrations assume.
-- Enum columns also can't accept the new severity values without
-- ALTER TYPE ADD VALUE for each one.
--
-- Fix: convert any USER-DEFINED (enum) column back to varchar so the
-- application's allowed-value sets are the single source of truth, then
-- rebuild the CHECK constraints with the full sets.

-- 1. Drop every CHECK on the table first — a CHECK referencing the old
--    enum type can block or follow the type change in surprising ways.
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

-- 2. Convert enum columns to varchar (enum → text cast is always safe).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'beta_pins' AND column_name = 'status'
               AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE beta_pins ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE beta_pins ALTER COLUMN status TYPE varchar(30) USING status::text;
    ALTER TABLE beta_pins ALTER COLUMN status SET DEFAULT 'open';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'beta_pins' AND column_name = 'severity'
               AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE beta_pins ALTER COLUMN severity DROP DEFAULT;
    ALTER TABLE beta_pins ALTER COLUMN severity TYPE varchar(30) USING severity::text;
    ALTER TABLE beta_pins ALTER COLUMN severity SET DEFAULT 'minor';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'beta_pins' AND column_name = 'kind'
               AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE beta_pins ALTER COLUMN kind DROP DEFAULT;
    ALTER TABLE beta_pins ALTER COLUMN kind TYPE varchar(20) USING kind::text;
    ALTER TABLE beta_pins ALTER COLUMN kind SET DEFAULT 'bug';
  END IF;
END $$;

-- 3. Recreate CHECKs with the full allowed sets (matches the app constants).
ALTER TABLE beta_pins
  ADD CONSTRAINT beta_pins_status_check
    CHECK (status IN ('open','in_progress','fixed','hidden','removed')),
  ADD CONSTRAINT beta_pins_severity_check
    CHECK (severity IN (
      'critical','problem','annoying','needs_tweak',
      'minor','low_priority','weird','look'
    )),
  ADD CONSTRAINT beta_pins_kind_check
    CHECK (kind IN ('bug','note','idea'));
