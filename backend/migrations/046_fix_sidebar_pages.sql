-- Migration 046: Fix sidebar_pages to match real app routes
-- Stale seeds pointed at non-existent routes (/dashboard, /lists, /budget,
-- /analytics, /beta) and were missing After Shop, Home Inventory, Pantry.

-- Home (main page): real route is '/' (page_path is UNIQUE so update in place)
UPDATE sidebar_pages
SET page_path = '/'
WHERE page_path = '/dashboard';

UPDATE sidebar_pages
SET page_name = 'Home', icon_name = 'Home', display_order = 1
WHERE page_path = '/' AND page_name IN ('Dashboard', 'Home');

-- 'Shopping Lists' pointed at /lists which has no route; '/' already covers it.
UPDATE sidebar_pages
SET enabled_for_user = false, enabled_for_beta = false, enabled_for_admin = false
WHERE page_path = '/lists';

-- Stale entries whose routes don't exist
DELETE FROM sidebar_pages WHERE page_path IN ('/budget', '/analytics', '/beta');

-- Admin pages: sidebar renders its own admin links, avoid duplicates in Main Menu
UPDATE sidebar_pages
SET enabled_for_user = false, enabled_for_beta = false, enabled_for_admin = false
WHERE page_path IN ('/admin', '/admin/users');

-- Add the missing real pages (idempotent)
-- Pantry intentionally omitted: legacy page, still reachable from the
-- Dashboard pantry widget via /pantry
INSERT INTO sidebar_pages (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin, is_system_page) VALUES
('Unpack', '/staging', 'Package', 2, true, true, true, false),
('Home Inventory', '/pantry-new-v2', 'Store', 3, true, true, true, false)
ON CONFLICT (page_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  icon_name = EXCLUDED.icon_name,
  is_system_page = EXCLUDED.is_system_page,
  display_order = EXCLUDED.display_order,
  enabled_for_user = EXCLUDED.enabled_for_user,
  enabled_for_beta = EXCLUDED.enabled_for_beta,
  enabled_for_admin = EXCLUDED.enabled_for_admin;

-- Hide legacy Pantry entry if it was previously seeded
UPDATE sidebar_pages
SET enabled_for_user = false, enabled_for_beta = false, enabled_for_admin = false
WHERE page_path = '/pantry';

-- Rename After Shop -> Unpack if it was inserted under the old label
UPDATE sidebar_pages SET page_name = 'Unpack' WHERE page_path = '/staging';

-- Ordering / names for remaining real routes
UPDATE sidebar_pages SET page_name = 'Recipe Book', icon_name = 'ChefHat', display_order = 5 WHERE page_path = '/recipes';
UPDATE sidebar_pages SET display_order = 9 WHERE page_path = '/settings';
