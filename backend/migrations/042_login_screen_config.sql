-- Migration 042: Login Screen Configuration
-- Allows admins to customize the login screen appearance

-- Login screen configuration table
CREATE TABLE IF NOT EXISTS login_screen_config (
  id SERIAL PRIMARY KEY,
  config_name VARCHAR(100) DEFAULT 'default',
  logo_url TEXT,
  background_type VARCHAR(50) DEFAULT 'gradient', -- gradient, image, color
  background_value TEXT DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  welcome_title VARCHAR(255) DEFAULT 'Welcome Back',
  welcome_subtitle TEXT DEFAULT 'Sign in to continue to your account',
  primary_color VARCHAR(7) DEFAULT '#667eea',
  secondary_color VARCHAR(7) DEFAULT '#764ba2',
  show_social_login BOOLEAN DEFAULT true,
  footer_text TEXT DEFAULT '© 2024 Your Company. All rights reserved.',
  custom_css TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO login_screen_config (
  config_name,
  logo_url,
  background_type,
  background_value,
  welcome_title,
  welcome_subtitle,
  primary_color,
  secondary_color,
  show_social_login,
  footer_text,
  is_active
) VALUES (
  'default',
  '/logo.png',
  'gradient',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'Welcome Back',
  'Sign in to continue to your account',
  '#667eea',
  '#764ba2',
  true,
  '© 2024 Your Company. All rights reserved.',
  true
);

-- Function to ensure only one active config
CREATE OR REPLACE FUNCTION ensure_single_active_login_config()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE login_screen_config 
    SET is_active = false 
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single active config
CREATE TRIGGER login_config_single_active
BEFORE UPDATE ON login_screen_config
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION ensure_single_active_login_config();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_login_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER login_config_updated_at
BEFORE UPDATE ON login_screen_config
FOR EACH ROW
EXECUTE FUNCTION update_login_config_updated_at();

-- Comments
COMMENT ON TABLE login_screen_config IS 'Configuration for customizable login screen appearance';
COMMENT ON COLUMN login_screen_config.background_type IS 'Type of background: gradient, image, or color';
COMMENT ON COLUMN login_screen_config.background_value IS 'CSS value for background (gradient string, image URL, or color hex)';
COMMENT ON COLUMN login_screen_config.is_active IS 'Only one config can be active at a time';
COMMENT ON COLUMN login_screen_config.custom_css IS 'Optional custom CSS for advanced styling';
