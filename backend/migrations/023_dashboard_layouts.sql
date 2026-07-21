-- Create dashboard_layouts table for storing tier-specific widget configurations
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id SERIAL PRIMARY KEY,
  tier_name VARCHAR(50) NOT NULL,
  widget_id INTEGER NOT NULL REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_tier ON dashboard_layouts(tier_name);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_widget ON dashboard_layouts(widget_id);

COMMENT ON TABLE dashboard_layouts IS 'Stores dashboard widget layouts for each tier (guest, free, premium, admin)';
COMMENT ON COLUMN dashboard_layouts.tier_name IS 'Tier this layout applies to: guest, free, premium, or admin';
COMMENT ON COLUMN dashboard_layouts.widget_id IS 'Reference to the widget in dashboard_widgets table';
COMMENT ON COLUMN dashboard_layouts.position IS 'Position in the grid (0-11 for 12-column layout)';
COMMENT ON COLUMN dashboard_layouts.enabled IS 'Whether this widget is enabled for this tier';
COMMENT ON COLUMN dashboard_layouts.settings IS 'Widget-specific settings as JSON';
