-- Migration 086: beta_pin_history
--
-- Removed pins are now HARD-DELETED from beta_pins (user request: "remove"
-- should actually delete). Before any destructive action we snapshot the
-- full pin row here so admins can read, recover, or ghost-highlight it in
-- the pin-history viewer.

CREATE TABLE IF NOT EXISTS beta_pin_history (
  id SERIAL PRIMARY KEY,
  pin_id INTEGER,                       -- original beta_pins.id (may be reused)
  event VARCHAR(20) NOT NULL,           -- 'deleted' | 'restored'
  actor_id INTEGER,                     -- admin who triggered the event
  snapshot JSONB NOT NULL,              -- full pin row at snapshot time
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_beta_pin_history_created ON beta_pin_history(created_at);
CREATE INDEX IF NOT EXISTS idx_beta_pin_history_event ON beta_pin_history(event);
