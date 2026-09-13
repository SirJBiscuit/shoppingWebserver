-- Item Training System Migration
-- Allows users and admins to train the item database over time

-- Add training fields to item_preferences table
ALTER TABLE item_preferences 
ADD COLUMN IF NOT EXISTS trained_by_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS training_frequency INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create item training submissions table for user suggestions
CREATE TABLE IF NOT EXISTS item_training_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  item_icon VARCHAR(10),
  preferred_unit VARCHAR(50),
  average_price DECIMAL(10, 2),
  notes TEXT,
  frequency INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_training_status ON item_training_submissions(status);
CREATE INDEX IF NOT EXISTS idx_item_training_user ON item_training_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_item_training_created ON item_training_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_preferences_trained ON item_preferences(trained_by_admin);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_item_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS item_preferences_update_timestamp ON item_preferences;
CREATE TRIGGER item_preferences_update_timestamp
  BEFORE UPDATE ON item_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_item_preferences_timestamp();

-- Insert some sample admin-trained items if table is empty
INSERT INTO item_preferences (name, category, preferred_icon, trained_by_admin, training_frequency)
VALUES 
  ('Milk', 'Dairy', '🥛', true, 10),
  ('Bread', 'Bakery', '🍞', true, 10),
  ('Eggs', 'Dairy', '🥚', true, 10),
  ('Chicken Breast', 'Meat', '🍗', true, 8),
  ('Ground Beef', 'Meat', '🥩', true, 8),
  ('Bananas', 'Produce', '🍌', true, 10),
  ('Apples', 'Produce', '🍎', true, 10),
  ('Tomatoes', 'Produce', '🍅', true, 7),
  ('Lettuce', 'Produce', '🥬', true, 7),
  ('Cheese', 'Dairy', '🧀', true, 9)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE item_training_submissions IS 'User-submitted item training data pending admin review';
COMMENT ON COLUMN item_preferences.trained_by_admin IS 'Whether this item was trained by an admin (higher confidence)';
COMMENT ON COLUMN item_preferences.training_frequency IS 'How many times this item has been used/trained';
