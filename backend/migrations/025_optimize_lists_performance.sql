-- Performance Optimization for Shopping Lists
-- Adds indexes, constraints, and optimizations for multi-user scalability

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_status 
  ON shopping_lists(user_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id 
  ON shopping_list_items(shopping_list_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_list 
  ON shopping_list_items(shopping_list_id, added_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_user_name 
  ON items(user_id, name);

CREATE INDEX IF NOT EXISTS idx_inventory_user_location 
  ON inventory(user_id, storage_location);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_lists_user_created 
  ON shopping_lists(user_id, created_at DESC);

-- Add index for item search/autocomplete (only if pg_trgm is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_items_name_trgm 
      ON items USING gin(name gin_trgm_ops);
  END IF;
END $$;

-- Add materialized view for list item counts (faster dashboard loading)
CREATE MATERIALIZED VIEW IF NOT EXISTS list_item_counts AS
SELECT 
  sl.id as list_id,
  sl.user_id,
  COUNT(sli.id) as item_count,
  COUNT(CASE WHEN sli.is_checked THEN 1 END) as purchased_count,
  COALESCE(SUM(sli.price * sli.quantity), 0) as total_cost
FROM shopping_lists sl
LEFT JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
WHERE sl.status = 'active'
GROUP BY sl.id, sl.user_id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_list_item_counts_list_id 
  ON list_item_counts(list_id);

-- Add function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_list_counts()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY list_item_counts;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- NOTE: per-statement triggers calling REFRESH MATERIALIZED VIEW
-- were intentionally removed — they hammered the DB on every write.
-- Refresh list_item_counts on demand (or via a scheduled job) instead.

-- Add partitioning preparation (for future scaling to millions of items)
-- This creates a template for partitioning by user_id ranges
COMMENT ON TABLE shopping_lists IS 'Consider partitioning by user_id when user count exceeds 10,000';
COMMENT ON TABLE shopping_list_items IS 'Consider partitioning by shopping_list_id hash when total items exceed 1,000,000';

-- Add table statistics for query planner
ANALYZE shopping_lists;
ANALYZE shopping_list_items;
ANALYZE items;
ANALYZE inventory;

-- Add constraints to ensure data integrity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_quantity_positive') THEN
    ALTER TABLE shopping_list_items ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_price_non_negative') THEN
    ALTER TABLE shopping_list_items ADD CONSTRAINT check_price_non_negative CHECK (price >= 0 OR price IS NULL);
  END IF;
END $$;

-- Add updated_at triggers for cache invalidation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopping_list_items_updated_at ON shopping_list_items;
CREATE TRIGGER update_shopping_list_items_updated_at
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Refresh the materialized view initially
REFRESH MATERIALIZED VIEW list_item_counts;
