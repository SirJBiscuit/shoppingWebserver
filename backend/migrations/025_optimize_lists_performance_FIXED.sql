-- Performance Optimization for Shopping Lists (CORRECTED FOR ACTUAL SCHEMA)
-- Adds indexes, constraints, and optimizations for multi-user scalability

-- Add indexes for faster queries (using actual column names)
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_status 
  ON shopping_lists(user_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id_active 
  ON shopping_list_items(shopping_list_id) 
  WHERE is_checked = false;

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_list 
  ON shopping_list_items(shopping_list_id, added_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_user_name 
  ON items(user_id, item_name);

CREATE INDEX IF NOT EXISTS idx_inventory_user_location 
  ON inventory(user_id, storage_location);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_lists_user_created 
  ON shopping_lists(user_id, created_at DESC);

-- Add index for item search/autocomplete (if pg_trgm extension exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_items_name_trgm 
      ON items USING gin(item_name gin_trgm_ops);
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

-- The refresh function and triggers already exist from the previous migration attempt
-- So we skip those

-- Add partitioning preparation comments (for future scaling)
COMMENT ON TABLE shopping_lists IS 'Consider partitioning by user_id when user count exceeds 10,000';
COMMENT ON TABLE shopping_list_items IS 'Consider partitioning by shopping_list_id hash when total items exceed 1,000,000';

-- Add table statistics for query planner
ANALYZE shopping_lists;
ANALYZE shopping_list_items;
ANALYZE items;
ANALYZE inventory;

-- Constraints already exist, so we skip those too

-- Refresh the materialized view initially
REFRESH MATERIALIZED VIEW list_item_counts;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Performance optimization migration completed successfully!';
  RAISE NOTICE 'Indexes created, materialized view ready.';
END $$;
