-- Migration 041: Sidebar Configuration System
-- Allows admins to configure which pages are visible to different user roles

-- Sidebar pages configuration table
CREATE TABLE IF NOT EXISTS sidebar_pages (
  id SERIAL PRIMARY KEY,
  page_name VARCHAR(100) NOT NULL,
  page_path VARCHAR(255) NOT NULL UNIQUE,
  icon_name VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  enabled_for_user BOOLEAN DEFAULT true,
  enabled_for_beta BOOLEAN DEFAULT true,
  enabled_for_admin BOOLEAN DEFAULT true,
  is_system_page BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_sidebar_pages_order ON sidebar_pages(display_order);
CREATE INDEX idx_sidebar_pages_enabled ON sidebar_pages(enabled_for_user, enabled_for_beta, enabled_for_admin);

-- Insert default pages
INSERT INTO sidebar_pages (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin, is_system_page) VALUES
('Dashboard', '/dashboard', 'Home', 1, true, true, true, true),
('Shopping Lists', '/lists', 'ShoppingCart', 2, true, true, true, true),
('Recipes', '/recipes', 'Book', 3, true, true, true, false),
('Budget Tracker', '/budget', 'DollarSign', 4, true, true, true, false),
('Analytics', '/analytics', 'BarChart', 5, false, true, true, false),
('Beta Features', '/beta', 'Star', 6, false, true, true, false),
('Admin Panel', '/admin', 'Shield', 7, false, false, true, true),
('User Management', '/admin/users', 'Users', 8, false, false, true, false),
('Settings', '/settings', 'Settings', 9, true, true, true, true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sidebar_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER sidebar_pages_updated_at
BEFORE UPDATE ON sidebar_pages
FOR EACH ROW
EXECUTE FUNCTION update_sidebar_pages_updated_at();

-- User-specific sidebar customizations (optional future feature)
CREATE TABLE IF NOT EXISTS user_sidebar_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  page_id INTEGER REFERENCES sidebar_pages(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT true,
  custom_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, page_id)
);

CREATE INDEX idx_user_sidebar_user ON user_sidebar_preferences(user_id);

-- Comments
COMMENT ON TABLE sidebar_pages IS 'Configuration for sidebar navigation pages with role-based visibility';
COMMENT ON COLUMN sidebar_pages.is_system_page IS 'System pages cannot be deleted, only disabled';
COMMENT ON COLUMN sidebar_pages.enabled_for_user IS 'Whether regular users can see this page';
COMMENT ON COLUMN sidebar_pages.enabled_for_beta IS 'Whether beta testers can see this page';
COMMENT ON COLUMN sidebar_pages.enabled_for_admin IS 'Whether admins can see this page';
COMMENT ON TABLE user_sidebar_preferences IS 'Optional per-user sidebar customizations';
