-- Migration 047: Household member catalog system
-- Tracks people in a household: profile, health stats, food preferences,
-- traits (likes/dislikes/pet peeves/habits), chores, and water intake.

CREATE TABLE IF NOT EXISTS household_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) DEFAULT 'member',
  avatar_emoji VARCHAR(10) DEFAULT '😀',
  color VARCHAR(20) DEFAULT '#6366f1',
  date_of_birth DATE,
  gender VARCHAR(20),
  height_cm DECIMAL(5,1),
  activity_level VARCHAR(20) DEFAULT 'moderate',
  diet_type VARCHAR(50) DEFAULT 'none',
  allergies TEXT[] DEFAULT '{}',
  daily_calorie_target INTEGER,
  water_goal_oz INTEGER DEFAULT 64,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS household_member_health_logs (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,1),
  body_fat_pct DECIMAL(4,1),
  muscle_pct DECIMAL(4,1),
  notes TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS household_member_water_logs (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  amount_oz INTEGER NOT NULL,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS household_member_food_prefs (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  food_name VARCHAR(200) NOT NULL,
  preference VARCHAR(10) NOT NULL DEFAULT 'like' CHECK (preference IN ('like','dislike')),
  tier CHAR(1) NOT NULL DEFAULT 'B' CHECK (tier IN ('S','A','B','C','D','F')),
  calories_per_serving INTEGER,
  serving_unit VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (member_id, food_name)
);

CREATE TABLE IF NOT EXISTS household_member_traits (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL CHECK (category IN ('like','dislike','pet_peeve','habit')),
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS household_member_chores (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly','monthly')),
  xp_value INTEGER DEFAULT 10,
  last_completed_at TIMESTAMP,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_food_prefs_member ON household_member_food_prefs(member_id);
CREATE INDEX IF NOT EXISTS idx_household_traits_member ON household_member_traits(member_id);
CREATE INDEX IF NOT EXISTS idx_household_chores_member ON household_member_chores(member_id);
CREATE INDEX IF NOT EXISTS idx_household_water_member_date ON household_member_water_logs(member_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_household_health_member ON household_member_health_logs(member_id);

-- Sidebar entry
INSERT INTO sidebar_pages (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin, is_system_page) VALUES
('Household', '/household', 'Users', 6, true, true, true, false)
ON CONFLICT (page_path) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order,
  enabled_for_user = EXCLUDED.enabled_for_user,
  enabled_for_beta = EXCLUDED.enabled_for_beta,
  enabled_for_admin = EXCLUDED.enabled_for_admin;
