-- Migration 076: element-anchored beta pins
--
-- Pins currently store x_pct/y_pct — a percentage of the document — which
-- drifts whenever content reflows (dynamic lists, different viewports).
-- These columns let the client anchor a pin to the actual DOM element under
-- the cursor: a generated CSS selector plus the click offset inside that
-- element's rect. x_pct/y_pct remain as the fallback when the selector no
-- longer resolves (element removed/renamed) and for legacy pins.

ALTER TABLE beta_pins
  ADD COLUMN IF NOT EXISTS element_selector TEXT,   -- generated CSS path to the anchor element
  ADD COLUMN IF NOT EXISTS offset_x NUMERIC(6,4),   -- click X inside element rect, 0-1
  ADD COLUMN IF NOT EXISTS offset_y NUMERIC(6,4);   -- click Y inside element rect, 0-1

COMMENT ON COLUMN beta_pins.element_selector IS 'CSS selector of the element the pin was dropped on; NULL = page-space fallback';
COMMENT ON COLUMN beta_pins.offset_x IS 'Horizontal offset within the anchor element (0-1)';
COMMENT ON COLUMN beta_pins.offset_y IS 'Vertical offset within the anchor element (0-1)';
