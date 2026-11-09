-- ============================================================================
-- 055: Household upgrades — chore repeat days, daily calorie intake logs,
--      'sometimes' food preference, eating-out tracking for meal patterns
-- ============================================================================

-- Chores: which weekdays they repeat on (0=Sun .. 6=Sat); NULL = every day
ALTER TABLE household_member_chores
  ADD COLUMN IF NOT EXISTS repeat_days SMALLINT[];

-- Food prefs: add the middle "sometimes/neutral" preference
ALTER TABLE household_member_food_prefs
  DROP CONSTRAINT IF EXISTS household_member_food_prefs_preference_check;
ALTER TABLE household_member_food_prefs
  ADD CONSTRAINT household_member_food_prefs_preference_check
  CHECK (preference IN ('like','sometimes','dislike'));

-- Daily calorie intake per member (one row per member per day)
CREATE TABLE IF NOT EXISTS household_member_calorie_logs (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL CHECK (calories > 0),
  logged_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes VARCHAR(255),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (member_id, logged_on)
);
CREATE INDEX IF NOT EXISTS idx_hh_calorie_logs_member ON household_member_calorie_logs(member_id, logged_on);

-- Eating-out log: restaurant runs, who it was for, what was ordered, cost.
-- Powers "pizza night" predictions + repeat orders + healthier/savings ideas.
CREATE TABLE IF NOT EXISTS household_eat_out_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES household_members(id) ON DELETE SET NULL,
  restaurant VARCHAR(150) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',        -- [{name, price}]
  total_cost NUMERIC(8,2),
  ordered_for VARCHAR(100),                 -- free text if not a member
  notes TEXT,
  eaten_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_eat_out_user_date ON household_eat_out_logs(user_id, eaten_on);
CREATE INDEX IF NOT EXISTS idx_eat_out_member ON household_eat_out_logs(member_id, eaten_on);
