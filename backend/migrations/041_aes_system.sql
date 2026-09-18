-- Migration 041: AES (Admin Editor System) Tables
-- Created: 2026-09-17
-- Purpose: Store custom layouts, snapshots, and templates for AES

-- ============================================
-- AES LAYOUTS TABLE
-- ============================================
-- Stores user's current custom layout
CREATE TABLE IF NOT EXISTS aes_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL,
  version VARCHAR(10) DEFAULT '1.0.0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one layout per user
  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX idx_aes_layouts_user_id ON aes_layouts(user_id);

-- Index for JSONB queries
CREATE INDEX idx_aes_layouts_layout ON aes_layouts USING GIN (layout);

-- ============================================
-- AES SNAPSHOTS TABLE
-- ============================================
-- Stores manual save points for layouts
CREATE TABLE IF NOT EXISTS aes_snapshots (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  layout JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Index for user snapshots
CREATE INDEX idx_aes_snapshots_user_id ON aes_snapshots(user_id);

-- Index for created_at (for sorting)
CREATE INDEX idx_aes_snapshots_created_at ON aes_snapshots(created_at DESC);

-- ============================================
-- AES TEMPLATES TABLE
-- ============================================
-- Stores shared layout templates (admin-created)
CREATE TABLE IF NOT EXISTS aes_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for public templates
CREATE INDEX idx_aes_templates_public ON aes_templates(is_public) WHERE is_public = true;

-- Index for downloads (for sorting)
CREATE INDEX idx_aes_templates_downloads ON aes_templates(downloads DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_aes_layout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for aes_layouts
CREATE TRIGGER trigger_update_aes_layout_timestamp
BEFORE UPDATE ON aes_layouts
FOR EACH ROW
EXECUTE FUNCTION update_aes_layout_timestamp();

-- Trigger for aes_templates
CREATE TRIGGER trigger_update_aes_template_timestamp
BEFORE UPDATE ON aes_templates
FOR EACH ROW
EXECUTE FUNCTION update_aes_layout_timestamp();

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Create default template for new users
INSERT INTO aes_templates (name, description, layout, is_public, created_by)
VALUES (
  'Default Layout',
  'The original default layout for new users',
  '{
    "dashboard": {
      "id": "dashboard_default",
      "name": "Default Dashboard Layout",
      "widgets": []
    },
    "sidebar": {
      "id": "sidebar_default",
      "name": "Default Sidebar Layout",
      "widgets": [],
      "visible": true,
      "position": "left",
      "width": "250px"
    },
    "metadata": {
      "version": "1.0.0",
      "createdAt": "2026-09-17T00:00:00Z",
      "isTemplate": true
    }
  }'::jsonb,
  true,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant permissions to application user (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON aes_layouts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON aes_snapshots TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON aes_templates TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE aes_layouts_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE aes_templates_id_seq TO your_app_user;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE aes_layouts IS 'Stores user custom layouts for AES';
COMMENT ON TABLE aes_snapshots IS 'Stores manual save points for layouts';
COMMENT ON TABLE aes_templates IS 'Stores shared layout templates';

COMMENT ON COLUMN aes_layouts.layout IS 'JSONB structure containing dashboard and sidebar configurations';
COMMENT ON COLUMN aes_layouts.version IS 'Layout schema version for migration compatibility';

COMMENT ON COLUMN aes_snapshots.id IS 'Custom ID from client (snapshot_timestamp_random)';
COMMENT ON COLUMN aes_snapshots.name IS 'User-friendly name for the snapshot';

COMMENT ON COLUMN aes_templates.is_public IS 'Whether template is visible to all users';
COMMENT ON COLUMN aes_templates.downloads IS 'Number of times template has been used';
