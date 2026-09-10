-- Sound library table
CREATE TABLE IF NOT EXISTS sounds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'check', 'uncheck', 'notification', 'success', 'error', etc.
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sound preferences
CREATE TABLE IF NOT EXISTS user_sound_preferences (
  user_id INTEGER PRIMARY KEY,
  sound_enabled BOOLEAN DEFAULT FALSE,
  sound_volume DECIMAL(3,2) DEFAULT 0.3,
  check_sound_id INTEGER,
  uncheck_sound_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (check_sound_id) REFERENCES sounds(id) ON DELETE SET NULL,
  FOREIGN KEY (uncheck_sound_id) REFERENCES sounds(id) ON DELETE SET NULL
);

-- Insert default sounds (placeholders - will be replaced with actual files)
INSERT INTO sounds (name, category, filename, file_path, is_default) VALUES
  ('Default Check', 'check', 'check.mp3', '/sounds/check.mp3', TRUE),
  ('Default Uncheck', 'uncheck', 'uncheck.mp3', '/sounds/uncheck.mp3', TRUE)
ON CONFLICT DO NOTHING;
