-- Create price_history table for tracking all price submissions
-- This enables admin review, outlier detection, and price intelligence

CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  shopping_item_id INTEGER REFERENCES shopping_items(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  item_icon VARCHAR(10),
  category VARCHAR(100),
  store_name VARCHAR(255),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit VARCHAR(50),
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_outlier BOOLEAN DEFAULT false,
  outlier_score DECIMAL(5,2),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_user ON price_history(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item_name ON price_history(item_name);
CREATE INDEX IF NOT EXISTS idx_price_history_status ON price_history(status);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON price_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_outlier ON price_history(is_outlier) WHERE is_outlier = true;
CREATE INDEX IF NOT EXISTS idx_price_history_store ON price_history(store_name);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_price_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER price_history_updated_at
  BEFORE UPDATE ON price_history
  FOR EACH ROW
  EXECUTE FUNCTION update_price_history_updated_at();

-- View for pending reviews
CREATE OR REPLACE VIEW price_history_pending AS
SELECT 
  ph.*,
  u.username,
  u.email
FROM price_history ph
LEFT JOIN users u ON ph.user_id = u.id
WHERE ph.status = 'pending'
ORDER BY ph.created_at DESC;

-- View for outliers
CREATE OR REPLACE VIEW price_history_outliers AS
SELECT 
  ph.*,
  u.username,
  u.email,
  (
    SELECT AVG(price) 
    FROM price_history 
    WHERE item_name = ph.item_name 
    AND status = 'approved'
    AND is_outlier = false
  ) as avg_price
FROM price_history ph
LEFT JOIN users u ON ph.user_id = u.id
WHERE ph.is_outlier = true
ORDER BY ph.outlier_score DESC, ph.created_at DESC;

-- View for statistics
CREATE OR REPLACE VIEW price_history_stats AS
SELECT 
  COUNT(*) as total_prices,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT item_name) as unique_items,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE is_outlier = true) as outlier_count,
  AVG(price) as overall_avg_price,
  MIN(created_at) as first_price_date,
  MAX(created_at) as last_price_date
FROM price_history;

-- Comments for documentation
COMMENT ON TABLE price_history IS 'Tracks all price submissions for review and intelligence';
COMMENT ON COLUMN price_history.status IS 'pending: awaiting review, approved: accepted, rejected: denied';
COMMENT ON COLUMN price_history.is_outlier IS 'Flagged by outlier detection algorithm';
COMMENT ON COLUMN price_history.outlier_score IS 'How far from average (higher = more suspicious)';
COMMENT ON COLUMN price_history.shopping_item_id IS 'Reference to original shopping item if available';
