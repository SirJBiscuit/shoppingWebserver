-- ============================================================================
-- 065: Plate system
--
-- Per-member daily plates: food-group servings, estimated calories and macro
-- splits, and a pluggable health-scoring service per member.
--   plate_entries         — one row per logged food item on someone's plate
--   plate_health_services — registry of scoring engines (mirrors the code
--                           registry in services/plateScoring.js)
--   household_members.health_service — which engine scores that member's plate
-- ============================================================================

CREATE TABLE IF NOT EXISTS plate_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES household_members(id) ON DELETE CASCADE, -- NULL = account owner
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type VARCHAR(20) DEFAULT 'snack',           -- breakfast|lunch|dinner|snack
  item_name VARCHAR(255) NOT NULL,
  food_group VARCHAR(30) NOT NULL,                 -- vegetables|fruits|protein|grains|dairy|extras|beverages
  servings DECIMAL(6,2) DEFAULT 1,
  calories INTEGER,
  protein_pct DECIMAL(4,1),                        -- estimated macro splits 0-100
  fat_pct DECIMAL(4,1),
  carb_pct DECIMAL(4,1),
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL,
  health_service VARCHAR(50) DEFAULT 'legacy',     -- scoring engine that produced the estimates
  scores_by_service JSONB DEFAULT '{}'::jsonb,     -- per-service contribution snapshot
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plate_entries_user_date ON plate_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_plate_entries_member_date ON plate_entries(member_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_plate_entries_recipe ON plate_entries(recipe_id);

-- Scoring-service registry (code registry is source of truth; table feeds UI + audits)
CREATE TABLE IF NOT EXISTS plate_health_services (
  key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO plate_health_services (key, name, description, version, is_active) VALUES
  ('legacy', 'Legacy Heuristic',
   'Original group-based estimates — fixed macro profiles per food group.', 1, true),
  ('balanced', 'Balanced Plate',
   'Stricter half-plate produce rule; protein-leaning profiles for mains.', 2, true),
  ('nutrition-api', 'Nutrition Lookup (coming soon)',
   'Reserved for a real nutrition database — entries will store per-item macros.', 0, false)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  is_active = EXCLUDED.is_active;

-- Which scoring engine each household member uses
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS health_service VARCHAR(50) DEFAULT 'legacy';
