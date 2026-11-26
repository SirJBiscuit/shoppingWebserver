// Shared MDL term-learning helpers — used by the store/mdl/shopping
// routes so every name-entry path teaches the same pending-term pool.
//
// kind='store' terms carry `canonical` — the main display form the
// variant maps to ("wanes" -> "Waynes"). Variants start 'pending': the
// author's own lookups see them immediately, the A/B trainer pairs them
// for beta testers, and admins promote the crowd-favourites to global.
const db = require('../database/db');

// Aggressive normalization for matching ("Wayne's " == "waynes").
const normName = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

// Upsert a learned term. Bumps usage_count when the same author re-uses a
// pending variant; never revives a rejected term or mutates an approved
// one's canonical.
const learnTerm = async (kind, term, canonical, userId) => {
  const t = String(term || '').trim();
  if (!t || t.length > 120) return;
  try {
    await db.query(
      `INSERT INTO mdl_custom_terms (kind, term, canonical, status, created_by, usage_count)
       VALUES ($1, $2, $3, 'pending', $4, 1)
       ON CONFLICT (kind, term) DO UPDATE SET
         usage_count = CASE
           WHEN mdl_custom_terms.status = 'pending' THEN mdl_custom_terms.usage_count + 1
           ELSE mdl_custom_terms.usage_count
         END,
         last_seen_at = NOW(),
         canonical = COALESCE(mdl_custom_terms.canonical, EXCLUDED.canonical)`,
      [kind, t, canonical || null, userId || null]
    );
  } catch (err) {
    console.error('learnTerm failed:', err.message);
  }
};

// Rows the caller may resolve against: their own stores + the shared
// catalog (unowned or public). Private stores from other users are never
// matched or returned.
const VISIBLE_STORE = `(s.user_id = $1 OR s.user_id IS NULL OR s.is_public = true)`;

// Resolve a typed store name to an existing store_locations row.
//   exact — normalized name match in the caller's visible set
//   alias — a learned variant (approved globally, or the caller's own
//           pending) mapping to a canonical store name
//   fuzzy — trigram similarity >= 0.55 ("wanes" -> "Waynes"); skipped
//           silently when pg_trgm isn't installed
// Returns { store, via } or null.
const resolveStore = async (uid, typed) => {
  const q = String(typed || '').trim();
  if (!q) return null;

  const ex = await db.query(
    `SELECT s.*, 'exact' AS via FROM store_locations s
     WHERE lower(btrim(COALESCE(s.name, s.store_name, ''))) = lower(btrim($2))
       AND ${VISIBLE_STORE}
     ORDER BY s.created_at ASC LIMIT 1`,
    [uid, q]
  );
  if (ex.rows.length) return { store: ex.rows[0], via: 'exact' };

  const al = await db.query(
    `SELECT s.*, 'alias' AS via FROM mdl_custom_terms t
     JOIN store_locations s
       ON lower(btrim(COALESCE(s.name, s.store_name, ''))) = lower(btrim(t.canonical))
     WHERE t.kind = 'store'
       AND (t.status = 'approved' OR (t.status = 'pending' AND t.created_by = $1))
       AND lower(btrim(t.term)) = lower(btrim($2))
       AND ${VISIBLE_STORE}
     ORDER BY s.created_at ASC LIMIT 1`,
    [uid, q]
  );
  if (al.rows.length) return { store: al.rows[0], via: 'alias' };

  try {
    const fz = await db.query(
      `SELECT s.*, 'fuzzy' AS via,
              similarity(lower(btrim(COALESCE(s.name, s.store_name, ''))), lower(btrim($2))) AS sim
       FROM store_locations s
       WHERE ${VISIBLE_STORE}
       ORDER BY sim DESC LIMIT 1`,
      [uid, q]
    );
    if (fz.rows.length && parseFloat(fz.rows[0].sim) >= 0.55) {
      return { store: fz.rows[0], via: 'fuzzy' };
    }
  } catch { /* pg_trgm unavailable — fuzzy matching silently skipped */ }

  return null;
};

module.exports = { normName, learnTerm, resolveStore };
