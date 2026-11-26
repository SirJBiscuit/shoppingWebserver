-- Migration 124: Hard backstop against duplicate store_locations rows.
-- Dupes used to accumulate because every create path did a blind INSERT —
-- "Walmart", "walmart ", "WALMART" all became separate rows.
--
-- Two scoped unique indexes instead of one global one:
--   * the public catalog (is_public / unowned rows) is unique worldwide
--   * private user stores are unique per user — one user's private
--     "Costco, Dallas" can never block another user's store of the same
--     name, and can't leak to them either
-- Both key on normalized name + city + state: same store name in the same
-- place is one store; "Walmart" in two different cities stays two
-- legitimately distinct locations. Rows with no usable name are exempt
-- (inserts require a name anyway).
--
-- NOTE: run the admin dedupe (POST /api/mdl/admin/stores/dedupe) first if
-- duplicates still exist — these indexes will fail while any remain.

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_locations_norm_public
  ON store_locations (
    lower(btrim(COALESCE(name, store_name, ''))),
    lower(btrim(COALESCE(city, ''))),
    lower(btrim(COALESCE(state, '')))
  )
  WHERE (is_public = true OR user_id IS NULL)
    AND lower(btrim(COALESCE(name, store_name, ''))) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_locations_norm_user
  ON store_locations (
    user_id,
    lower(btrim(COALESCE(name, store_name, ''))),
    lower(btrim(COALESCE(city, ''))),
    lower(btrim(COALESCE(state, '')))
  )
  WHERE user_id IS NOT NULL
    AND lower(btrim(COALESCE(name, store_name, ''))) <> '';
