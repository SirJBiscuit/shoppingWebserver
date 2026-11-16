-- Migration 083: expanded pin severities
--
-- Adds the 4 new triage categories to the beta_pins.severity CHECK:
--   problem, needs_tweak, low_priority, look
-- (alongside the original critical / annoying / minor / weird).
--
-- The constraint may exist under any name depending on which 074/082
-- variant created it, so drop every CHECK on the table and rebuild both
-- status and severity with the full sets — same pattern as 082.

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
    CHECK (severity IN (
      'critical','problem','annoying','needs_tweak',
      'minor','low_priority','weird','look'
    ));
