-- Node-glyph pad: a second stored layout so the account can swap between a
-- labeled bubble pad and an anonymous glyph grid at login.
-- quick_glyph_pad NULL falls back to a default N×N lattice (gridLayoutFor).
-- quick_pad_mode is the account's default pad style for the login modal.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_glyph_pad TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_pad_mode VARCHAR(10) NOT NULL DEFAULT 'bubble';
