-- Migration 125: Smart store-name learning.
--
-- Users type the same store many ways ("Waynes" / "waynes" / "wanes" /
-- "Wayne's"). The system learns each spelling as a variant of a canonical
-- name, keeps ONE main display form, and never overrides a user's own
-- preferred form.
--
-- Pieces:
--   * mdl_custom_terms.canonical — for kind='store' terms, the main store
--     name this variant maps to. Variants flow through the existing
--     pending → A/B tester votes → admin review pipeline, so the crowd
--     pre-filters bad spellings before they go global.
--   * user_store_names — a user's personal preferred form for a store.
--     Always wins over the global canonical in autofill; nothing ever
--     overwrites it.
--   * pg_trgm + trigram indexes — fuzzy "did you mean" matching so close
--     spellings resolve to an existing store instead of duping.

ALTER TABLE mdl_custom_terms ADD COLUMN IF NOT EXISTS canonical VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_mdl_terms_store_canonical
  ON mdl_custom_terms(canonical) WHERE kind = 'store';

CREATE TABLE IF NOT EXISTS user_store_names (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_location_id INTEGER NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
  preferred_name VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, store_location_id)
);
CREATE INDEX IF NOT EXISTS idx_user_store_names_user ON user_store_names(user_id);

-- Trigram matching — extension needs elevated rights on some hosts, so
-- guard it; the code falls back to prefix matching when unavailable.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm unavailable — fuzzy store matching will use prefix fallback';
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_store_locations_name_trgm
      ON store_locations USING gin ((lower(btrim(COALESCE(name, store_name, '''')))) gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_mdl_terms_store_term_trgm
      ON mdl_custom_terms USING gin ((lower(term)) gin_trgm_ops) WHERE kind = ''store''';
  END IF;
END $$;
