-- ============================================================================
-- 066: Remove Spice Lab from the sidebar
--
-- Spice Lab now lives exclusively inside the Homemade Lab hub (/lab -> /spices).
-- The sidebar_pages row seeded by 056 is disabled rather than deleted so admins
-- can re-enable it later; the /spices route + feature stay intact.
-- ============================================================================

UPDATE sidebar_pages
SET enabled_for_user = false,
    enabled_for_beta = false,
    enabled_for_admin = false
WHERE page_path = '/spices';
