-- check-mdl-beta.sql — verifies MDL term learning is actually working
-- for beta testers on the live database.
--
-- Run on the server:
--   docker exec -i shop_postgres psql -U shopuser -d shopdb < scripts/check-mdl-beta.sql
-- (or copy/paste the queries into: docker exec -it shop_postgres psql -U shopuser -d shopdb)

\echo '=== 1. Table exists + totals ==='
SELECT COUNT(*) AS total_terms,
       COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
       COUNT(*) FILTER (WHERE status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
FROM mdl_custom_terms;

\echo '=== 2. Terms by kind ==='
SELECT kind, COUNT(*) AS n FROM mdl_custom_terms GROUP BY kind ORDER BY n DESC;

\echo '=== 3. Terms created by beta testers ==='
SELECT u.username, t.kind, COUNT(*) AS terms_created,
       COUNT(*) FILTER (WHERE t.status = 'approved') AS approved
FROM mdl_custom_terms t
JOIN users u ON u.id = t.created_by
WHERE u.is_beta_tester
GROUP BY u.username, t.kind
ORDER BY terms_created DESC;

\echo '=== 4. Terms created by NON-beta users (sanity comparison) ==='
SELECT u.username, COUNT(*) AS terms_created
FROM mdl_custom_terms t
JOIN users u ON u.id = t.created_by
WHERE NOT u.is_beta_tester
GROUP BY u.username
ORDER BY terms_created DESC;

\echo '=== 5. A/B trainer votes by beta testers ==='
SELECT u.username, COUNT(*) AS ab_votes
FROM mdl_ab_votes v
JOIN users u ON u.id = v.user_id
GROUP BY u.username, u.is_beta_tester
ORDER BY ab_votes DESC;

\echo '=== 6. Per-user preferred store names (migration 125) ==='
SELECT u.username,
       COALESCE(l.name, l.store_name) AS store_name,
       s.preferred_name,
       u.is_beta_tester AS beta,
       s.updated_at
FROM user_store_names s
JOIN users u ON u.id = s.user_id
JOIN store_locations l ON l.id = s.store_location_id
ORDER BY s.updated_at DESC
LIMIT 20;

\echo '=== 7. Canonical linkages on store terms ==='
SELECT term, canonical, status, usage_count
FROM mdl_custom_terms
WHERE kind = 'store'
ORDER BY COALESCE(canonical, term), term
LIMIT 30;

\echo '=== 8. 10 most recent terms (who is teaching what) ==='
SELECT t.created_at, u.username, u.is_beta_tester AS beta, t.kind, t.term, t.canonical, t.status
FROM mdl_custom_terms t
LEFT JOIN users u ON u.id = t.created_by
ORDER BY t.created_at DESC
LIMIT 10;
