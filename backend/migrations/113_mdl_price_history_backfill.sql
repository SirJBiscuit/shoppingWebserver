-- ============================================================================
-- 113: Backfill mdl_price_history from mdl_user_item_history
--
-- /track-item recorded prices into the per-user history and pattern tables
-- but never wrote the global product price log — mdl_price_history only got
-- rows from the admin endpoint, and average_price froze at its first value.
-- track-item now records observations directly; this migration replays the
-- prices already collected so the product DB isn't starting from zero.
--
-- Only history rows whose item name resolves to an existing
-- product_master_data row are backfilled — names the quality gate rejected
-- never produced a product row and stay out.
-- ============================================================================

INSERT INTO mdl_price_history (product_id, price, store, source, recorded_at)
SELECT p.id, h.price, h.store_name, 'user_input', h.added_at
FROM mdl_user_item_history h
JOIN mdl_item_names n ON n.id = h.item_name_id
JOIN product_master_data p ON normalize_item_name(p.product_name) = n.normalized_name
WHERE h.price IS NOT NULL
  AND h.price > 0
  AND NOT EXISTS (
    SELECT 1 FROM mdl_price_history ph
    WHERE ph.product_id = p.id
      AND ph.source = 'user_input'
      AND ph.recorded_at = h.added_at
  );

-- Recompute product averages from the now-complete history
UPDATE product_master_data p
SET average_price = sub.avg_price,
    last_price_update = COALESCE(sub.last_seen, p.last_price_update)
FROM (
  SELECT product_id, AVG(price) AS avg_price, MAX(recorded_at) AS last_seen
  FROM mdl_price_history
  GROUP BY product_id
) sub
WHERE p.id = sub.product_id;
