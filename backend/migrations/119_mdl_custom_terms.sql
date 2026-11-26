-- MDL custom terms — learned vocabulary: units, custom item names, store
-- names, categories. Users submit terms as they use them; they enter the
-- pool as 'pending' (visible to their own author only) until an admin
-- approves them, at which point they surface globally in quick pickers
-- and autofill. Admins can also reject/forget terms outright.

CREATE TABLE IF NOT EXISTS mdl_custom_terms (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(30) NOT NULL,           -- 'unit' | 'item' | 'store' | 'category' | ...
  term VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  UNIQUE (kind, term)
);

CREATE INDEX IF NOT EXISTS idx_mdl_custom_terms_kind_status
  ON mdl_custom_terms(kind, status);

CREATE INDEX IF NOT EXISTS idx_mdl_custom_terms_creator
  ON mdl_custom_terms(created_by);
