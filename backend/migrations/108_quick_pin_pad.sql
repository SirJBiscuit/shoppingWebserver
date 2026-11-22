-- Custom swipe-pad layout: the digit order around the scattered ring.
-- NULL falls back to the deterministic seeded order (padOrderFor).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_pin_pad TEXT;
