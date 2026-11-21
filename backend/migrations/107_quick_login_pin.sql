-- Numeric PIN mode for quick login: a long digit password the admin types
-- fast on a pad. Verified whole, so it stores as a bcrypt hash (the symbol
-- sequence needs plaintext for partial-position challenges; a PIN doesn't).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_pin TEXT,
  ADD COLUMN IF NOT EXISTS quick_pin_len INT;
