-- Migration 084: pin kinds
--
-- Adds beta_pins.kind ('bug' | 'note' | 'idea'). Bug pins feed the admin
-- export list; note and idea pins are exempt — they're for marking things
-- to remember or suggestions rather than defects.

ALTER TABLE beta_pins
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'bug';

ALTER TABLE beta_pins DROP CONSTRAINT IF EXISTS beta_pins_kind_check;
ALTER TABLE beta_pins
  ADD CONSTRAINT beta_pins_kind_check CHECK (kind IN ('bug', 'note', 'idea'));
