-- ============================================================================
-- 056: Spice Lab sidebar page + canonical MDL product categories
--
-- 1) Spice Lab shipped behind feature flag 'spice_blends' (053) and a
--    Sidebar fallback entry, but was never seeded into the API-driven
--    sidebar_pages table — so the nav hid it whenever sidebarPages loaded.
-- 2) product_master_data.category was free text; normalize to the 13
--    canonical names via the canonical_category() function (052).
-- ============================================================================

INSERT INTO sidebar_pages
  (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin, is_system_page)
VALUES
  ('Spice Lab', '/spices', 'Flame', 6, true, true, true, false)
ON CONFLICT (page_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  enabled_for_user = true,
  enabled_for_beta = true,
  enabled_for_admin = true;

-- Household safety net (047 seeded it; DO NOTHING if present)
INSERT INTO sidebar_pages
  (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin, is_system_page)
VALUES
  ('Household', '/household', 'Users', 7, true, true, true, false)
ON CONFLICT (page_path) DO NOTHING;

-- Normalize existing MDL product categories to canonical names
UPDATE product_master_data
SET category = canonical_category(category)
WHERE category IS NOT NULL
  AND canonical_category(category) IS DISTINCT FROM category;
