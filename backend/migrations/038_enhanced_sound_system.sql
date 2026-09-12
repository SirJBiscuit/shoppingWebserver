-- Enhanced Sound System Migration
-- Adds comprehensive sound management with global controls and per-widget assignments

-- Drop old constraints if they exist
ALTER TABLE user_sound_preferences DROP CONSTRAINT IF EXISTS user_sound_preferences_check_sound_id_fkey;
ALTER TABLE user_sound_preferences DROP CONSTRAINT IF EXISTS user_sound_preferences_uncheck_sound_id_fkey;

-- Add new columns to sounds table
ALTER TABLE sounds ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;
ALTER TABLE sounds ADD COLUMN IF NOT EXISTS duration DECIMAL(5,2) DEFAULT 0;
ALTER TABLE sounds ADD COLUMN IF NOT EXISTS uploaded_by INTEGER;
ALTER TABLE sounds ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create sound categories table
CREATE TABLE IF NOT EXISTS sound_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default sound categories
INSERT INTO sound_categories (name, display_name, description) VALUES
  ('check', 'Item Checked', 'Sound when checking off an item'),
  ('uncheck', 'Item Unchecked', 'Sound when unchecking an item'),
  ('pop', 'Item to Cart', 'Sound when item flies to cart'),
  ('shake', 'Item Interaction', 'Sound for item shake/interaction'),
  ('notification', 'Notification', 'General notification sound'),
  ('success', 'Success', 'Success action sound'),
  ('error', 'Error', 'Error message sound'),
  ('warning', 'Warning', 'Warning message sound'),
  ('delete', 'Delete', 'Item deleted sound'),
  ('add', 'Add Item', 'Item added sound'),
  ('scan', 'Barcode Scan', 'Barcode scanner sound'),
  ('voice', 'Voice Command', 'Voice command activated sound')
ON CONFLICT (name) DO NOTHING;

-- Create global sound settings table (admin controls)
CREATE TABLE IF NOT EXISTS global_sound_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  sounds_enabled_globally BOOLEAN DEFAULT TRUE,
  default_volume DECIMAL(3,2) DEFAULT 0.5,
  allow_user_override BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  CONSTRAINT check_single_row CHECK (id = 1)
);

-- Insert default global settings
INSERT INTO global_sound_settings (id, sounds_enabled_globally, default_volume, allow_user_override)
VALUES (1, TRUE, 0.5, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Create category-specific global settings
CREATE TABLE IF NOT EXISTS global_category_settings (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  default_sound_id INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_name) REFERENCES sound_categories(name) ON DELETE CASCADE,
  FOREIGN KEY (default_sound_id) REFERENCES sounds(id) ON DELETE SET NULL,
  UNIQUE(category_name)
);

-- Insert default category settings
INSERT INTO global_category_settings (category_name, is_enabled) 
SELECT name, TRUE FROM sound_categories
ON CONFLICT (category_name) DO NOTHING;

-- Enhance user_sound_preferences table
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS pop_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS shake_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS notification_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS success_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS error_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS warning_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS delete_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS add_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS scan_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS voice_sound_id INTEGER;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS override_global BOOLEAN DEFAULT FALSE;
ALTER TABLE user_sound_preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key constraints for new sound categories
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_pop_sound 
  FOREIGN KEY (pop_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_shake_sound 
  FOREIGN KEY (shake_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_notification_sound 
  FOREIGN KEY (notification_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_success_sound 
  FOREIGN KEY (success_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_error_sound 
  FOREIGN KEY (error_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_warning_sound 
  FOREIGN KEY (warning_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_delete_sound 
  FOREIGN KEY (delete_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_add_sound 
  FOREIGN KEY (add_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_scan_sound 
  FOREIGN KEY (scan_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;
ALTER TABLE user_sound_preferences ADD CONSTRAINT fk_voice_sound 
  FOREIGN KEY (voice_sound_id) REFERENCES sounds(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sounds_category ON sounds(category);
CREATE INDEX IF NOT EXISTS idx_sounds_active ON sounds(is_active);
CREATE INDEX IF NOT EXISTS idx_sounds_uploaded_by ON sounds(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_global_category_settings_category ON global_category_settings(category_name);

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_sound_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_sound_prefs_updated
  BEFORE UPDATE ON user_sound_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_sound_timestamp();

CREATE TRIGGER trigger_global_sound_settings_updated
  BEFORE UPDATE ON global_sound_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_sound_timestamp();

CREATE TRIGGER trigger_global_category_settings_updated
  BEFORE UPDATE ON global_category_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_sound_timestamp();

-- Insert more default sounds for new categories
INSERT INTO sounds (name, category, filename, file_path, is_default, is_active) VALUES
  ('Pop', 'pop', 'pop.mp3', '/sounds/pop.mp3', TRUE, TRUE),
  ('Shake', 'shake', 'shake.mp3', '/sounds/shake.mp3', TRUE, TRUE),
  ('Notification', 'notification', 'notification.mp3', '/sounds/notification.mp3', TRUE, TRUE),
  ('Success', 'success', 'success.mp3', '/sounds/success.mp3', TRUE, TRUE),
  ('Error', 'error', 'error.mp3', '/sounds/error.mp3', TRUE, TRUE),
  ('Warning', 'warning', 'warning.mp3', '/sounds/warning.mp3', TRUE, TRUE),
  ('Delete', 'delete', 'delete.mp3', '/sounds/delete.mp3', TRUE, TRUE),
  ('Add', 'add', 'add.mp3', '/sounds/add.mp3', TRUE, TRUE),
  ('Scan', 'scan', 'scan.mp3', '/sounds/scan.mp3', TRUE, TRUE),
  ('Voice', 'voice', 'voice.mp3', '/sounds/voice.mp3', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Create view for easy sound management
CREATE OR REPLACE VIEW sound_management_view AS
SELECT 
  s.id,
  s.name,
  s.category,
  sc.display_name as category_display,
  s.filename,
  s.file_path,
  s.file_size,
  s.duration,
  s.is_default,
  s.is_active,
  s.created_at,
  u.username as uploaded_by_username,
  gcs.is_enabled as category_enabled_globally
FROM sounds s
LEFT JOIN sound_categories sc ON s.category = sc.name
LEFT JOIN users u ON s.uploaded_by = u.id
LEFT JOIN global_category_settings gcs ON s.category = gcs.category_name
ORDER BY s.category, s.name;
