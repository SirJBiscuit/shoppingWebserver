-- Performance Optimization for Shopping Lists
-- Adds indexes, constraints, and optimizations for multi-user scalability

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_status 
  ON shopping_lists(created_by, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id 
  ON shopping_list_items(list_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_list 
  ON shopping_list_items(list_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_user_name 
  ON items(user_id, item_name);

CREATE INDEX IF NOT EXISTS idx_inventory_user_location 
  ON inventory(user_id, storage_location) 
  WHERE deleted_at IS NULL;

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_lists_user_created 
  ON shopping_lists(created_by, created_at DESC);

-- Add index for item search/autocomplete
CREATE INDEX IF NOT EXISTS idx_items_name_trgm 
  ON items USING gin(item_name gin_trgm_ops);

-- Add materialized view for list item counts (faster dashboard loading)
CREATE MATERIALIZED VIEW IF NOT EXISTS list_item_counts AS
SELECT 
  sl.id as list_id,
  sl.created_by,
  COUNT(sli.id) as item_count,
  COUNT(CASE WHEN sli.purchased THEN 1 END) as purchased_count,
  COALESCE(SUM(sli.price * sli.quantity), 0) as total_cost
FROM shopping_lists sl
LEFT JOIN shopping_list_items sli ON sl.id = sli.list_id AND sli.deleted_at IS NULL
WHERE sl.status = 'active'
GROUP BY sl.id, sl.created_by;

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

-- Add triggers to auto-refresh counts when items change
DROP TRIGGER IF EXISTS trigger_refresh_list_counts_insert ON shopping_list_items;
CREATE TRIGGER trigger_refresh_list_counts_insert
  AFTER INSERT ON shopping_list_items
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_list_counts();

DROP TRIGGER IF EXISTS trigger_refresh_list_counts_update ON shopping_list_items;
CREATE TRIGGER trigger_refresh_list_counts_update
  AFTER UPDATE ON shopping_list_items
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_list_counts();

DROP TRIGGER IF EXISTS trigger_refresh_list_counts_delete ON shopping_list_items;
CREATE TRIGGER trigger_refresh_list_counts_delete
  AFTER DELETE ON shopping_list_items
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_list_counts();

-- Add partitioning preparation (for future scaling to millions of items)
-- This creates a template for partitioning by user_id ranges
COMMENT ON TABLE shopping_lists IS 'Consider partitioning by created_by when user count exceeds 10,000';
COMMENT ON TABLE shopping_list_items IS 'Consider partitioning by list_id hash when total items exceed 1,000,000';

-- Add table statistics for query planner
ANALYZE shopping_lists;
ANALYZE shopping_list_items;
ANALYZE items;
ANALYZE inventory;

-- Add constraints to ensure data integrity
ALTER TABLE shopping_list_items 
  ADD CONSTRAINT check_quantity_positive 
  CHECK (quantity > 0);

ALTER TABLE shopping_list_items 
  ADD CONSTRAINT check_price_non_negative 
  CHECK (price >= 0 OR price IS NULL);

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
