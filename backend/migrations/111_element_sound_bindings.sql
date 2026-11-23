-- Element sound bindings: admin clicks any element in the app and assigns
-- it a sound. sound_name is a synth category ('pop', 'check', ...) that
-- resolves through the normal preference chain; sound_id optionally pins
-- a specific library file instead.

CREATE TABLE IF NOT EXISTS element_sound_bindings (
  id SERIAL PRIMARY KEY,
  selector TEXT NOT NULL,
  element_label VARCHAR(300),
  event VARCHAR(20) NOT NULL DEFAULT 'click',
  sound_name VARCHAR(50),
  sound_id INTEGER REFERENCES sounds(id) ON DELETE SET NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_element_sound_bindings_enabled
  ON element_sound_bindings(enabled);
