-- Auto Update System
-- Tracks automatic updates, notifications, and system status

-- Update log table
CREATE TABLE IF NOT EXISTS update_log (
  id SERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL, -- 'started', 'success', 'failed'
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_update_log_status ON update_log(status);
CREATE INDEX IF NOT EXISTS idx_update_log_created ON update_log(created_at DESC);

-- System notifications (for all users)
CREATE TABLE IF NOT EXISTS system_notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'update_success', 'update_failed', 'maintenance', etc.
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created ON system_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_notifications_read ON system_notifications(is_read);

-- Admin notifications (for admins only)
CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON admin_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- System status table (single row)
CREATE TABLE IF NOT EXISTS system_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_version VARCHAR(100),
  last_update_check TIMESTAMP,
  last_successful_update TIMESTAMP,
  is_updating BOOLEAN DEFAULT FALSE,
  update_available BOOLEAN DEFAULT FALSE,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row if not exists
INSERT INTO system_status (id, current_version, updated_at)
VALUES (1, 'initial', NOW())
ON CONFLICT (id) DO NOTHING;

-- Function to auto-update system_status timestamp
CREATE OR REPLACE FUNCTION update_system_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for system_status
DROP TRIGGER IF EXISTS trigger_system_status_updated ON system_status;
CREATE TRIGGER trigger_system_status_updated
  BEFORE UPDATE ON system_status
  FOR EACH ROW
  EXECUTE FUNCTION update_system_status_timestamp();

-- View for recent update history
CREATE OR REPLACE VIEW recent_updates AS
SELECT 
  id,
  status,
  details->>'duration' as duration_ms,
  details->>'error' as error_message,
  created_at,
  CASE 
    WHEN status = 'success' THEN '✅'
    WHEN status = 'failed' THEN '❌'
    WHEN status = 'started' THEN '🔄'
    ELSE '❓'
  END as status_icon
FROM update_log
ORDER BY created_at DESC
LIMIT 20;

-- View for unread admin notifications
CREATE OR REPLACE VIEW unread_admin_notifications AS
SELECT 
  id,
  type,
  message,
  severity,
  created_at,
  CASE severity
    WHEN 'critical' THEN '🔴'
    WHEN 'high' THEN '🟠'
    WHEN 'medium' THEN '🟡'
    ELSE '🟢'
  END as severity_icon
FROM admin_notifications
WHERE is_read = FALSE
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  created_at DESC;

-- Function to clean old notifications (run daily)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete system notifications older than 7 days
  DELETE FROM system_notifications
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Delete read admin notifications older than 30 days
  DELETE FROM admin_notifications
  WHERE is_read = TRUE 
    AND read_at < NOW() - INTERVAL '30 days';
    
  -- Delete old update logs (keep last 100)
  DELETE FROM update_log
  WHERE id NOT IN (
    SELECT id FROM update_log
    ORDER BY created_at DESC
    LIMIT 100
  );
END;
$$ LANGUAGE plpgsql;
