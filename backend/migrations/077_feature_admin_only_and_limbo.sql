-- Migration 077: admin_only + is_limbo gates on feature_flags
--
-- Fixes ACH Customization leaking to every user (min_tier 'admin' never
-- existed in TIER_HIERARCHY so it collapsed to 0 = everyone).
-- admin_only = only is_admin users see it.
-- is_limbo   = shelved features: hidden from ALL users regardless of
--              is_enabled, restored by clearing the flag.
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS admin_only BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_limbo  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN feature_flags.admin_only IS 'Only admin users see this feature';
COMMENT ON COLUMN feature_flags.is_limbo IS 'Shelved — hidden from every user until restored';

-- ACH Customization: admin-only, always enabled for admins
UPDATE feature_flags SET admin_only = TRUE, is_enabled = TRUE, min_tier = 'free'
  WHERE feature_key = 'ach_customization';

-- Shelve broken/outdated features into limbo
UPDATE feature_flags SET is_limbo = TRUE, is_enabled = FALSE
  WHERE feature_key IN ('meal_planner', 'recipe_discovery', 'activity_history', 'voice_input', 'barcode_scanner', 'meal_planning', 'barcode_scanning', 'recipe_import', 'templates');

-- New flags: Homemade Lab hub + sub-labs, notepad, household
INSERT INTO feature_flags (feature_key, feature_name, description, category, min_tier, is_enabled, free_tier_enabled, premium_tier_enabled, display_order)
VALUES
  ('homemade_lab', 'Homemade Lab', 'Hub for make-it-at-home labs', 'labs', 'free', true, true, true, 8),
  ('lab_spice',    'Spice Lab',    'Spice rack tracking and blends', 'labs', 'free', true, true, true, 81),
  ('lab_mix',      'Mix & Blend Lab', 'Pesto, tzatziki, guac builders', 'labs', 'free', true, true, true, 82),
  ('lab_meal',     'Meal Lab',     'Build meals from home inventory', 'labs', 'free', true, true, true, 83),
  ('lab_smoothie', 'Smoothie Lab', 'Smoothies from available fruit', 'labs', 'free', true, true, true, 84),
  ('lab_jam',      'Jam Lab',      'Jams and preserves from fruit', 'labs', 'free', true, true, true, 85),
  ('lab_dough',    'Dough Lab',    'Pizza, bread, pretzel doughs', 'labs', 'free', true, true, true, 86),
  ('lab_plate',    'Plate',        'Balanced plates and macros', 'labs', 'free', true, true, true, 87),
  ('notepad',      'Notepad',      'Floating notepad tool', 'tools', 'free', true, true, true, 40),
  ('household',    'Household',    'Household members and sharing', 'core', 'free', true, true, true, 9),
  ('statistics',   'Stats',        'Shopping statistics and trends', 'analytics', 'free', true, true, true, 50)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description  = EXCLUDED.description,
  category     = EXCLUDED.category,
  is_enabled   = EXCLUDED.is_enabled;
