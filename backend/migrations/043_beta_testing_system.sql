-- Migration 043: Beta Testing System
-- Creates tables for beta testing codes, beta testers, and layout configurations

-- ============================================================================
-- 1. BETA TESTING CODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS beta_testing_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for beta_testing_codes
CREATE INDEX idx_beta_codes_code ON beta_testing_codes(code);
CREATE INDEX idx_beta_codes_active ON beta_testing_codes(is_active, expires_at);
CREATE INDEX idx_beta_codes_creator ON beta_testing_codes(created_by);

-- ============================================================================
-- 2. BETA TESTERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS beta_testers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  beta_code_id INTEGER REFERENCES beta_testing_codes(id) ON DELETE SET NULL,
  beta_username VARCHAR(100) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  country VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  accepted_data_policy BOOLEAN DEFAULT false,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP,
  feedback_count INTEGER DEFAULT 0
);

-- Indexes for beta_testers
CREATE INDEX idx_beta_testers_user ON beta_testers(user_id);
CREATE INDEX idx_beta_testers_location ON beta_testers(country, state);
CREATE INDEX idx_beta_testers_code ON beta_testers(beta_code_id);
CREATE INDEX idx_beta_testers_display_name ON beta_testers(display_name);

-- ============================================================================
-- 3. LAYOUT CONFIGURATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS layout_configurations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'beta', 'admin')),
  config_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for layout_configurations
CREATE INDEX idx_layouts_role ON layout_configurations(role);
CREATE INDEX idx_layouts_active ON layout_configurations(is_active);
CREATE INDEX idx_layouts_creator ON layout_configurations(created_by);
CREATE INDEX idx_layouts_role_active ON layout_configurations(role, is_active);

-- Unique constraint: Only one active layout per role
CREATE UNIQUE INDEX idx_layouts_unique_active_per_role 
  ON layout_configurations(role) 
  WHERE is_active = true;

-- ============================================================================
-- 4. UPDATE USERS TABLE
-- ============================================================================
-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'user' CHECK (account_type IN ('admin', 'user', 'beta'));

-- Index for account type
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_is_beta ON users(is_beta_tester);

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp for beta_testing_codes
CREATE OR REPLACE FUNCTION update_beta_code_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_beta_code_timestamp
  BEFORE UPDATE ON beta_testing_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_beta_code_timestamp();

-- Trigger to update updated_at timestamp for layout_configurations
CREATE OR REPLACE FUNCTION update_layout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_layout_timestamp
  BEFORE UPDATE ON layout_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_layout_timestamp();

-- Trigger to ensure only one active layout per role
CREATE OR REPLACE FUNCTION ensure_single_active_layout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other layouts for this role
    UPDATE layout_configurations
    SET is_active = false
    WHERE role = NEW.role AND id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_active_layout
  BEFORE INSERT OR UPDATE ON layout_configurations
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_layout();

-- Trigger to update last_active for beta testers
CREATE OR REPLACE FUNCTION update_beta_tester_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_beta_tester = true THEN
    UPDATE beta_testers
    SET last_active = CURRENT_TIMESTAMP
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_beta_tester_activity
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
  EXECUTE FUNCTION update_beta_tester_activity();

-- ============================================================================
-- 6. DEFAULT DATA
-- ============================================================================

-- Insert default layouts for each role
INSERT INTO layout_configurations (name, description, role, config_data, is_active, created_by)
VALUES 
  (
    'Default Admin Layout',
    'Full-featured admin dashboard with all tools and analytics',
    'admin',
    '{
      "widgets": [
        {
          "id": "analytics-overview",
          "type": "AnalyticsWidget",
          "position": {"x": 0, "y": 0},
          "size": {"width": 12, "height": 4}
        },
        {
          "id": "user-management",
          "type": "UserManagementWidget",
          "position": {"x": 0, "y": 4},
          "size": {"width": 6, "height": 6}
        },
        {
          "id": "system-health",
          "type": "SystemHealthWidget",
          "position": {"x": 6, "y": 4},
          "size": {"width": 6, "height": 6}
        }
      ],
      "theme": {
        "primaryColor": "#667eea",
        "layout": "grid",
        "spacing": "comfortable"
      }
    }'::jsonb,
    true,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
  ),
  (
    'Default User Layout',
    'Standard user dashboard with shopping and pantry features',
    'user',
    '{
      "widgets": [
        {
          "id": "shopping-list",
          "type": "ShoppingListWidget",
          "position": {"x": 0, "y": 0},
          "size": {"width": 8, "height": 8}
        },
        {
          "id": "pantry-quick-view",
          "type": "PantryWidget",
          "position": {"x": 8, "y": 0},
          "size": {"width": 4, "height": 4}
        },
        {
          "id": "suggestions",
          "type": "SuggestionsWidget",
          "position": {"x": 8, "y": 4},
          "size": {"width": 4, "height": 4}
        }
      ],
      "theme": {
        "primaryColor": "#667eea",
        "layout": "grid",
        "spacing": "comfortable"
      }
    }'::jsonb,
    true,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
  ),
  (
    'Clean Beta Dashboard',
    'Simplified dashboard for beta testers with core features only',
    'beta',
    '{
      "widgets": [
        {
          "id": "shopping-list-simple",
          "type": "ShoppingListWidget",
          "position": {"x": 0, "y": 0},
          "size": {"width": 12, "height": 10},
          "props": {
            "showAdvancedFeatures": false,
            "theme": "minimal"
          }
        },
        {
          "id": "beta-feedback",
          "type": "BetaFeedbackWidget",
          "position": {"x": 0, "y": 10},
          "size": {"width": 12, "height": 4},
          "props": {
            "placeholder": "Share your feedback to help us improve..."
          }
        }
      ],
      "theme": {
        "primaryColor": "#667eea",
        "layout": "single-column",
        "spacing": "comfortable"
      }
    }'::jsonb,
    true,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique beta code
CREATE OR REPLACE FUNCTION generate_beta_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code in format: BETA-YYYY-XXXX
    new_code := 'BETA-' || 
                TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
                UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM beta_testing_codes WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to check if beta code is valid
CREATE OR REPLACE FUNCTION is_beta_code_valid(code_to_check VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
  code_record RECORD;
BEGIN
  SELECT * INTO code_record
  FROM beta_testing_codes
  WHERE code = code_to_check;
  
  -- Code doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Code is not active
  IF code_record.is_active = false THEN
    RETURN false;
  END IF;
  
  -- Code has expired
  IF code_record.expires_at < CURRENT_TIMESTAMP THEN
    RETURN false;
  END IF;
  
  -- Code has reached max uses
  IF code_record.current_uses >= code_record.max_uses THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to increment beta code usage
CREATE OR REPLACE FUNCTION increment_beta_code_usage(code_to_use VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE beta_testing_codes
  SET current_uses = current_uses + 1
  WHERE code = code_to_use;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get active layout for role
CREATE OR REPLACE FUNCTION get_active_layout(user_role VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
  layout_config JSONB;
BEGIN
  SELECT config_data INTO layout_config
  FROM layout_configurations
  WHERE role = user_role AND is_active = true
  LIMIT 1;
  
  RETURN layout_config;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE beta_testing_codes IS 'Stores beta testing access codes with expiration and usage limits';
COMMENT ON TABLE beta_testers IS 'Stores beta tester information and location data for store training';
COMMENT ON TABLE layout_configurations IS 'Stores dashboard layout configurations for different user roles';

COMMENT ON COLUMN beta_testing_codes.code IS 'Unique beta access code in format BETA-YYYY-XXXX';
COMMENT ON COLUMN beta_testing_codes.max_uses IS 'Maximum number of times this code can be used';
COMMENT ON COLUMN beta_testing_codes.current_uses IS 'Current number of times this code has been used';

COMMENT ON COLUMN beta_testers.beta_username IS 'Username for login (system identifier)';
COMMENT ON COLUMN beta_testers.display_name IS 'Nickname for admin identification and feedback display (e.g., "John", "TechGuru", "BetaTester01")';
COMMENT ON COLUMN beta_testers.country IS 'Country for location-based store training data';
COMMENT ON COLUMN beta_testers.state IS 'State/Province for location-based store training data';
COMMENT ON COLUMN beta_testers.accepted_data_policy IS 'Whether user accepted data usage policy';

COMMENT ON COLUMN layout_configurations.config_data IS 'JSONB configuration for dashboard layout including widgets and theme';
COMMENT ON COLUMN layout_configurations.is_active IS 'Only one layout per role can be active at a time';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
