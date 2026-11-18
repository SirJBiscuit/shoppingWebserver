-- 100_list_item_removal_log.sql
-- Powers the "Previously removed" quick re-add section in Smart Suggestions.
-- A row is written (best-effort) whenever a shopping-list item is deleted.

CREATE TABLE IF NOT EXISTS list_item_removal_log (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shopping_list_id INTEGER,
  item_name       TEXT NOT NULL,
  quantity        NUMERIC(10,2),
  unit            VARCHAR(50),
  price           NUMERIC(10,2),
  category        VARCHAR(100),
  removed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_removal_log_user_time
  ON list_item_removal_log (user_id, removed_at DESC);
