-- ============================================================================
-- 052: Canonical categories
--
-- shopping_list_items.category stores free-text from the old detector
-- ('Meat', 'Dairy', 'Pantry', 'Canned', ...) which never joins
-- categories.name ('Meat & Seafood', 'Dairy & Eggs', 'Pantry Staples', ...),
-- so items lose their category icon + shopping order. Normalize all existing
-- values to the 13 canonical names.
-- ============================================================================

-- Reusable mapping expression: maps any stored/legacy label to canonical.
-- Anything unrecognized falls back to the name-based pass below or 'Other'.

CREATE OR REPLACE FUNCTION canonical_category(raw TEXT) RETURNS TEXT AS $$
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN RETURN NULL; END IF;
  RETURN CASE lower(btrim(raw))
    -- already canonical
    WHEN 'produce' THEN 'Produce'
    WHEN 'meat & seafood' THEN 'Meat & Seafood'
    WHEN 'dairy & eggs' THEN 'Dairy & Eggs'
    WHEN 'frozen' THEN 'Frozen'
    WHEN 'bakery' THEN 'Bakery'
    WHEN 'pantry staples' THEN 'Pantry Staples'
    WHEN 'snacks' THEN 'Snacks'
    WHEN 'beverages' THEN 'Beverages'
    WHEN 'condiments & sauces' THEN 'Condiments & Sauces'
    WHEN 'breakfast' THEN 'Breakfast'
    WHEN 'household' THEN 'Household'
    WHEN 'personal care' THEN 'Personal Care'
    WHEN 'other' THEN 'Other'
    -- legacy detector labels
    WHEN 'fruits' THEN 'Produce'
    WHEN 'vegetables' THEN 'Produce'
    WHEN 'fresh' THEN 'Produce'
    WHEN 'meat' THEN 'Meat & Seafood'
    WHEN 'seafood' THEN 'Meat & Seafood'
    WHEN 'deli' THEN 'Meat & Seafood'
    WHEN 'fish' THEN 'Meat & Seafood'
    WHEN 'dairy' THEN 'Dairy & Eggs'
    WHEN 'eggs' THEN 'Dairy & Eggs'
    WHEN 'ice cream' THEN 'Frozen'
    WHEN 'pantry' THEN 'Pantry Staples'
    WHEN 'canned' THEN 'Pantry Staples'
    WHEN 'canned goods' THEN 'Pantry Staples'
    WHEN 'dry goods' THEN 'Pantry Staples'
    WHEN 'grains' THEN 'Pantry Staples'
    WHEN 'lunch' THEN 'Pantry Staples'
    WHEN 'dinner' THEN 'Pantry Staples'
    WHEN 'baking' THEN 'Pantry Staples'
    WHEN 'spices' THEN 'Condiments & Sauces'
    WHEN 'condiments' THEN 'Condiments & Sauces'
    WHEN 'sauces' THEN 'Condiments & Sauces'
    WHEN 'alcohol' THEN 'Beverages'
    WHEN 'drinks' THEN 'Beverages'
    WHEN 'cleaning' THEN 'Household'
    WHEN 'paper' THEN 'Household'
    WHEN 'kitchen' THEN 'Household'
    WHEN 'laundry' THEN 'Household'
    WHEN 'storage' THEN 'Household'
    WHEN 'pet' THEN 'Household'
    WHEN 'pet supplies' THEN 'Household'
    WHEN 'baby' THEN 'Household'
    WHEN 'automotive' THEN 'Household'
    WHEN 'garden' THEN 'Household'
    WHEN 'tools' THEN 'Household'
    WHEN 'bathroom' THEN 'Personal Care'
    WHEN 'health' THEN 'Personal Care'
    WHEN 'beauty' THEN 'Personal Care'
    WHEN 'hygiene' THEN 'Personal Care'
    WHEN 'medical' THEN 'Personal Care'
    ELSE 'Other'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Shopping list items
UPDATE shopping_list_items
SET category = canonical_category(category)
WHERE category IS NOT NULL
  AND canonical_category(category) IS DISTINCT FROM category;

-- 2. Items catalog (per-user master list)
UPDATE items
SET category = canonical_category(category)
WHERE category IS NOT NULL
  AND canonical_category(category) IS DISTINCT FROM category;

-- 3. Template items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'template_items' AND column_name = 'category'
  ) THEN
    EXECUTE $$inner$$
      UPDATE template_items
      SET category = canonical_category(category)
      WHERE category IS NOT NULL
        AND canonical_category(category) IS DISTINCT FROM category
    $$inner$$;
  END IF;
END $$;

-- 4. Staging area (post-checkout items)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staging_area' AND column_name = 'category'
  ) THEN
    EXECUTE $$inner$$
      UPDATE staging_area
      SET category = canonical_category(category)
      WHERE category IS NOT NULL
        AND canonical_category(category) IS DISTINCT FROM category
    $$inner$$;
  END IF;
END $$;
