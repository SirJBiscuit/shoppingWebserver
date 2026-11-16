-- Migration 087: beta_feature_polls — progress statuses + text color
--
-- Poll lifecycle was open → planned → released / declined. The admin wants
-- progress tracking instead: thinking / in_progress / working → shipped,
-- or dropped. Also adds text_color for poll title styling.
-- Same enum→varchar normalization as 085 in case this column is an enum type.

-- 1. Drop existing CHECK constraints on the table
DO $$
DECLARE con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'beta_feature_polls' AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE beta_feature_polls DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

-- 2. Normalize enum-typed status column to varchar (no-op if already varchar)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'beta_feature_polls' AND column_name = 'status'
               AND data_type = 'USER-DEFINED') THEN
    ALTER TABLE beta_feature_polls ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE beta_feature_polls ALTER COLUMN status TYPE varchar(30) USING status::text;
    ALTER TABLE beta_feature_polls ALTER COLUMN status SET DEFAULT 'open';
  END IF;
END $$;

-- 3. Remap legacy statuses to the new progress set
UPDATE beta_feature_polls SET status = CASE status
  WHEN 'planned'  THEN 'thinking'
  WHEN 'released' THEN 'shipped'
  WHEN 'declined' THEN 'dropped'
  ELSE status END;

-- 4. Title text color for poll styling
ALTER TABLE beta_feature_polls
  ADD COLUMN IF NOT EXISTS text_color VARCHAR(20);

-- 5. Rebuild CHECKs with the full allowed sets
ALTER TABLE beta_feature_polls
  ADD CONSTRAINT beta_feature_polls_status_check
    CHECK (status IN ('open','thinking','in_progress','working','shipped','dropped'));
