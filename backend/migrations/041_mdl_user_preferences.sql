-- MDL User Preferences Table
-- Stores user preferences that persist across sessions and devices

CREATE TABLE IF NOT EXISTS mdl_user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

CREATE INDEX idx_mdl_user_preferences_user_id ON mdl_user_preferences(user_id);
CREATE INDEX idx_mdl_user_preferences_key ON mdl_user_preferences(preference_key);

COMMENT ON TABLE mdl_user_preferences IS 'Stores user preferences synced across devices';
COMMENT ON COLUMN mdl_user_preferences.preference_key IS 'Preference identifier (e.g., last_active_list_id, theme, notification_settings)';
COMMENT ON COLUMN mdl_user_preferences.preference_value IS 'Preference value stored as text (can be JSON for complex preferences)';
