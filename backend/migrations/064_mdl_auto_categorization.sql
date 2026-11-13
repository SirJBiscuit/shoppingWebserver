-- ============================================================================
-- 064: MDL auto-categorization
--
-- mdl_item_names.predicted_category / category_confidence columns have existed
-- since 040 but nothing populates them. This migration:
--   1. Creates mdl_category_learned: name -> canonical category mappings that
--      strengthen every time a name is (re)categorized (usage, admin, product).
--   2. Backfills mappings from existing categorized rows (shopping_list_items,
--      items catalog, product_master_data).
--   3. Backfills mdl_item_names.predicted_category with the strongest mapping.
--   4. Re-categorizes product_master_data rows still stuck on 'Other' when a
--      learned mapping exists.
-- ============================================================================

CREATE TABLE IF NOT EXISTS mdl_category_learned (
  id SERIAL PRIMARY KEY,
  normalized_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  times_seen INTEGER DEFAULT 1,
  confidence DECIMAL(3,2) DEFAULT 0.60,
  source VARCHAR(30) DEFAULT 'usage',   -- usage | admin | product | import
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (normalized_name, category)
);

CREATE INDEX IF NOT EXISTS idx_mdl_catlearned_name ON mdl_category_learned(normalized_name);
CREATE INDEX IF NOT EXISTS idx_mdl_catlearned_category ON mdl_category_learned(category);

-- ============================================================================
-- BACKFILL 1: learned mappings from existing categorized rows
-- ============================================================================

-- From shopping-list usage (what users actually filed items under)
INSERT INTO mdl_category_learned (normalized_name, category, times_seen, confidence, source)
SELECT LOWER(TRIM(sli.item_name)), canonical_category(sli.category), COUNT(*),
       LEAST(0.90, 0.50 + COUNT(*)::decimal / 20), 'usage'
FROM shopping_list_items sli
WHERE sli.item_name IS NOT NULL AND btrim(sli.item_name) <> ''
  AND canonical_category(sli.category) <> 'Other'
GROUP BY 1, 2
ON CONFLICT (normalized_name, category) DO UPDATE
SET times_seen = mdl_category_learned.times_seen + EXCLUDED.times_seen,
    confidence = GREATEST(mdl_category_learned.confidence, EXCLUDED.confidence),
    updated_at = CURRENT_TIMESTAMP;

-- From the items catalog
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'category'
  ) THEN
    EXECUTE $$
      INSERT INTO mdl_category_learned (normalized_name, category, times_seen, confidence, source)
      SELECT LOWER(TRIM(i.name)), canonical_category(i.category), COUNT(*),
             LEAST(0.90, 0.55 + COUNT(*)::decimal / 20), 'usage'
      FROM items i
      WHERE i.name IS NOT NULL AND btrim(i.name) <> ''
        AND canonical_category(i.category) <> 'Other'
      GROUP BY 1, 2
      ON CONFLICT (normalized_name, category) DO UPDATE
      SET times_seen = mdl_category_learned.times_seen + EXCLUDED.times_seen,
          confidence = GREATEST(mdl_category_learned.confidence, EXCLUDED.confidence),
          updated_at = CURRENT_TIMESTAMP
    $$;
  END IF;
END $do$;

-- From curated products (authoritative — highest base confidence)
INSERT INTO mdl_category_learned (normalized_name, category, times_seen, confidence, source)
SELECT LOWER(TRIM(p.product_name)), canonical_category(p.category), 3, 0.90, 'product'
FROM product_master_data p
WHERE canonical_category(p.category) <> 'Other'
ON CONFLICT (normalized_name, category) DO UPDATE
SET confidence = GREATEST(mdl_category_learned.confidence, EXCLUDED.confidence),
    source = CASE WHEN mdl_category_learned.confidence < EXCLUDED.confidence
                  THEN 'product' ELSE mdl_category_learned.source END,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- BACKFILL 2: mdl_item_names predictions from strongest mapping
-- ============================================================================

UPDATE mdl_item_names n
SET predicted_category = best.category,
    category_confidence = best.confidence,
    is_trained = true
FROM (
  SELECT DISTINCT ON (normalized_name) normalized_name, category, confidence
  FROM mdl_category_learned
  ORDER BY normalized_name, confidence DESC, times_seen DESC
) best
WHERE n.normalized_name = best.normalized_name
  AND (n.predicted_category IS NULL OR n.category_confidence < best.confidence);

-- ============================================================================
-- BACKFILL 3: products stuck on 'Other' that have a learned mapping
-- ============================================================================

UPDATE product_master_data p
SET category = best.category
FROM (
  SELECT DISTINCT ON (normalized_name) normalized_name, category
  FROM mdl_category_learned
  WHERE confidence >= 0.70
  ORDER BY normalized_name, confidence DESC, times_seen DESC
) best
WHERE LOWER(TRIM(p.product_name)) = best.normalized_name
  AND canonical_category(p.category) = 'Other';
