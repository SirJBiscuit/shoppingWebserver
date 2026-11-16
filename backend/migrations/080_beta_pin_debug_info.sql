-- Migration 080: beta pin debug info
--
-- Pins already store a generated CSS selector for their anchor element
-- (migration 076), but a raw selector is hard to read in the exported bug
-- list. These columns capture human-readable context at drop time: a short
-- element label (tag + id/classes + text snippet, e.g. `button#add "Add"`)
-- and the tester's viewport size, so exported reports show exactly which
-- element was pinned and on what screen size.

ALTER TABLE beta_pins
  ADD COLUMN IF NOT EXISTS element_label VARCHAR(300), -- human-readable anchor element description
  ADD COLUMN IF NOT EXISTS viewport VARCHAR(30);       -- e.g. '1366x768' — screen size at drop time

COMMENT ON COLUMN beta_pins.element_label IS 'Human-readable description of the anchored element (tag, id/classes, text snippet)';
COMMENT ON COLUMN beta_pins.viewport IS 'Browser viewport size (WxH) when the pin was dropped';
