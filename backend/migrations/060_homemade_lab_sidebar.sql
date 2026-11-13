-- Migration 060: Seed "Homemade Lab" into API-driven sidebar_pages
-- (legacy fallback in Sidebar.js covers databases where sidebar_pages is empty)

INSERT INTO sidebar_pages
  (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin, is_system_page)
VALUES
  ('Homemade Lab', '/lab', 'FlaskConical', 5, true, true, true, false)
ON CONFLICT (page_path) DO NOTHING;
