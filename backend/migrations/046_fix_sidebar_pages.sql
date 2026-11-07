-- Migration 046: Fix sidebar_pages to match real app routes
-- Stale seeds pointed at non-existent routes (/dashboard, /lists, /budget,
-- /analytics, /beta) and were missing After Shop, Home Inventory, Pantry.

-- Dashboard: real route is '/' (page_path is UNIQUE so update in place)
UPDATE sidebar_pages
SET page_path = '/', page_name = 'Dashboard', icon_name = 'ShoppingCart', display_order = 1
WHERE page_path = '/dashboard';

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
INSERT INTO sidebar_pages (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin, is_system_page) VALUES
('After Shop', '/staging', 'Package', 2, true, true, true, false),
('Home Inventory', '/pantry-new-v2', 'Home', 3, true, true, true, false),
('Pantry', '/pantry', 'ChefHat', 4, true, true, true, false)
ON CONFLICT (page_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  enabled_for_user = EXCLUDED.enabled_for_user,
  enabled_for_beta = EXCLUDED.enabled_for_beta,
  enabled_for_admin = EXCLUDED.enabled_for_admin;

-- Ordering / names for remaining real routes
UPDATE sidebar_pages SET page_name = 'Recipe Book', icon_name = 'ChefHat', display_order = 5 WHERE page_path = '/recipes';
UPDATE sidebar_pages SET display_order = 9 WHERE page_path = '/settings';
