-- Admin Actions Log Table
-- Tracks all admin customization changes for audit trail

CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_admin_actions_user_id ON admin_actions(user_id);
CREATE INDEX idx_admin_actions_action ON admin_actions(action);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);

-- Create a view for recent admin activity
CREATE OR REPLACE VIEW recent_admin_activity AS
SELECT 
  aa.id,
  aa.action,
  aa.details,
  aa.created_at,
  u.username,
  u.email
FROM admin_actions aa
LEFT JOIN users u ON aa.user_id = u.id
ORDER BY aa.created_at DESC
LIMIT 100;

COMMENT ON TABLE admin_actions IS 'Logs all admin customization actions for audit trail';
COMMENT ON COLUMN admin_actions.action IS 'Type of action: git_commit, git_push, config_change, etc.';
COMMENT ON COLUMN admin_actions.details IS 'JSON details about the action';
