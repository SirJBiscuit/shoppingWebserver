-- Sound library table
CREATE TABLE IF NOT EXISTS sounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'check', 'uncheck', 'notification', 'success', 'error', etc.
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User sound preferences
CREATE TABLE IF NOT EXISTS user_sound_preferences (
  user_id INTEGER PRIMARY KEY,
  sound_enabled INTEGER DEFAULT 0,
  sound_volume REAL DEFAULT 0.3,
  check_sound_id INTEGER,
  uncheck_sound_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (check_sound_id) REFERENCES sounds(id) ON DELETE SET NULL,
  FOREIGN KEY (uncheck_sound_id) REFERENCES sounds(id) ON DELETE SET NULL
);

-- Insert default sounds (placeholders - will be replaced with actual files)
INSERT INTO sounds (name, category, filename, file_path, is_default) VALUES
  ('Default Check', 'check', 'check.mp3', '/sounds/check.mp3', 1),
  ('Default Uncheck', 'uncheck', 'uncheck.mp3', '/sounds/uncheck.mp3', 1);
