-- Item attribution — who added what. Seeds the future household
-- profiles feature: every shopping_list_items row records the adding
-- user so household members can see who contributed each item.
-- added_at already exists on this table (schema.sql) — this adds the "who".

ALTER TABLE shopping_list_items
  ADD COLUMN IF NOT EXISTS added_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_added_by
  ON shopping_list_items(added_by);
