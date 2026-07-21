-- Add min_tier column to feature_flags table

ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS min_tier VARCHAR(50) DEFAULT 'free';

-- Update existing features to have proper min_tier values
UPDATE feature_flags SET min_tier = 'free' WHERE min_tier IS NULL;

COMMENT ON COLUMN feature_flags.min_tier IS 'Minimum tier required to access this feature: guest, free, or premium';
