-- Migration 081: selectable pin indicator icons
--
-- Pins default to the classic map-pin marker, but different indicators are
-- clearer for different kinds of reports (bug, idea, question, warning...).
-- The chosen icon is stored per pin so markers/list/export keep it.

ALTER TABLE beta_pins
  ADD COLUMN IF NOT EXISTS icon VARCHAR(30) NOT NULL DEFAULT 'pin';

COMMENT ON COLUMN beta_pins.icon IS 'Marker icon key chosen at drop time (pin|flag|bug|idea|warn|question|star|eye)';
