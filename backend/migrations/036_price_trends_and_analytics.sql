-- Price Trends and Analytics System
-- Similar to RuneScape Grand Exchange price tracking

-- Add trend tracking columns to price_history
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS day_of_week INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS week_of_year INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS month INTEGER;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS year INTEGER;

-- Update existing records with date components
UPDATE price_history 
SET 
  day_of_week = EXTRACT(DOW FROM created_at),
  week_of_year = EXTRACT(WEEK FROM created_at),
  month = EXTRACT(MONTH FROM created_at),
  year = EXTRACT(YEAR FROM created_at)
WHERE day_of_week IS NULL;

-- Create price trends aggregation table
CREATE TABLE IF NOT EXISTS price_trends (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  store_name VARCHAR(255),
  
  -- Time period
  period_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Price statistics
  avg_price DECIMAL(10, 2),
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),
  median_price DECIMAL(10, 2),
  
  -- Volume and volatility
  sample_count INTEGER DEFAULT 0,
  price_variance DECIMAL(10, 4),
  price_stddev DECIMAL(10, 4),
  
  -- Trend indicators
  price_change DECIMAL(10, 2), -- Change from previous period
  price_change_percent DECIMAL(10, 4),
  trend_direction VARCHAR(10), -- 'up', 'down', 'stable'
  
  -- Best day/time insights
  best_day_to_buy INTEGER, -- Day of week (0-6)
  best_week_to_buy INTEGER, -- Week of month (1-4)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_trends_item ON price_trends(item_name);
CREATE INDEX IF NOT EXISTS idx_price_trends_store ON price_trends(store_name);
CREATE INDEX IF NOT EXISTS idx_price_trends_period ON price_trends(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_price_trends_item_period ON price_trends(item_name, period_type, period_start);

-- Create price change alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  store_name VARCHAR(255),
  
  -- Alert conditions
  alert_type VARCHAR(20) NOT NULL, -- 'price_drop', 'price_increase', 'threshold'
  threshold_price DECIMAL(10, 2),
  threshold_percent DECIMAL(10, 4),
  
  -- Alert status
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP,
  trigger_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_item ON price_alerts(item_name);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);

-- Create shopping recommendations table
CREATE TABLE IF NOT EXISTS shopping_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Recommendation details
  recommendation_type VARCHAR(50) NOT NULL, -- 'best_day', 'price_drop', 'seasonal'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Items affected
  item_names TEXT[], -- Array of item names
  estimated_savings DECIMAL(10, 2),
  
  -- Timing
  recommended_date DATE,
  recommended_day_of_week INTEGER,
  expires_at TIMESTAMP,
  
  -- Status
  is_viewed BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_recs_user ON shopping_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_recs_date ON shopping_recommendations(recommended_date);
CREATE INDEX IF NOT EXISTS idx_shopping_recs_active ON shopping_recommendations(is_dismissed, expires_at);

-- Create materialized view for quick price trend lookups
CREATE MATERIALIZED VIEW IF NOT EXISTS item_price_summary AS
SELECT 
  item_name,
  store_name,
  COUNT(*) as total_entries,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  STDDEV(price) as price_stddev,
  
  -- Current trend (last 7 days vs previous 7 days)
  (SELECT AVG(price) FROM price_history ph2 
   WHERE ph2.item_name = ph.item_name 
   AND ph2.store_name = ph.store_name
   AND ph2.created_at >= NOW() - INTERVAL '7 days'
   AND ph2.status = 'active') as avg_price_last_7d,
   
  (SELECT AVG(price) FROM price_history ph2 
   WHERE ph2.item_name = ph.item_name 
   AND ph2.store_name = ph.store_name
   AND ph2.created_at >= NOW() - INTERVAL '14 days'
   AND ph2.created_at < NOW() - INTERVAL '7 days'
   AND ph2.status = 'active') as avg_price_prev_7d,
  
  -- Best day to buy (lowest average price by day of week)
  (SELECT day_of_week 
   FROM price_history ph2 
   WHERE ph2.item_name = ph.item_name 
   AND ph2.store_name = ph.store_name
   AND ph2.status = 'active'
   GROUP BY day_of_week 
   ORDER BY AVG(price) ASC 
   LIMIT 1) as best_day_to_buy,
  
  -- Worst day to buy (highest average price by day of week)
  (SELECT day_of_week 
   FROM price_history ph2 
   WHERE ph2.item_name = ph.item_name 
   AND ph2.store_name = ph.store_name
   AND ph2.status = 'active'
   GROUP BY day_of_week 
   ORDER BY AVG(price) DESC 
   LIMIT 1) as worst_day_to_buy,
  
  MAX(created_at) as last_updated
FROM price_history ph
WHERE status = 'active'
GROUP BY item_name, store_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_price_summary_item_store 
  ON item_price_summary(item_name, store_name);

-- Function to calculate price trend
CREATE OR REPLACE FUNCTION calculate_price_trend(
  p_item_name VARCHAR,
  p_store_name VARCHAR,
  p_period_type VARCHAR,
  p_period_start TIMESTAMP,
  p_period_end TIMESTAMP
) RETURNS TABLE (
  avg_price DECIMAL,
  min_price DECIMAL,
  max_price DECIMAL,
  sample_count INTEGER,
  price_change DECIMAL,
  price_change_percent DECIMAL,
  trend_direction VARCHAR
) AS $$
DECLARE
  v_current_avg DECIMAL;
  v_previous_avg DECIMAL;
  v_change DECIMAL;
  v_change_percent DECIMAL;
  v_direction VARCHAR;
BEGIN
  -- Get current period average
  SELECT AVG(price), MIN(price), MAX(price), COUNT(*)
  INTO v_current_avg, min_price, max_price, sample_count
  FROM price_history
  WHERE item_name = p_item_name
    AND (p_store_name IS NULL OR store_name = p_store_name)
    AND created_at >= p_period_start
    AND created_at < p_period_end
    AND status = 'active';
  
  -- Get previous period average
  IF p_period_type = 'daily' THEN
    SELECT AVG(price) INTO v_previous_avg
    FROM price_history
    WHERE item_name = p_item_name
      AND (p_store_name IS NULL OR store_name = p_store_name)
      AND created_at >= p_period_start - INTERVAL '1 day'
      AND created_at < p_period_start
      AND status = 'active';
  ELSIF p_period_type = 'weekly' THEN
    SELECT AVG(price) INTO v_previous_avg
    FROM price_history
    WHERE item_name = p_item_name
      AND (p_store_name IS NULL OR store_name = p_store_name)
      AND created_at >= p_period_start - INTERVAL '1 week'
      AND created_at < p_period_start
      AND status = 'active';
  ELSIF p_period_type = 'monthly' THEN
    SELECT AVG(price) INTO v_previous_avg
    FROM price_history
    WHERE item_name = p_item_name
      AND (p_store_name IS NULL OR store_name = p_store_name)
      AND created_at >= p_period_start - INTERVAL '1 month'
      AND created_at < p_period_start
      AND status = 'active';
  END IF;
  
  -- Calculate change
  IF v_previous_avg IS NOT NULL AND v_previous_avg > 0 THEN
    v_change := v_current_avg - v_previous_avg;
    v_change_percent := (v_change / v_previous_avg) * 100;
    
    IF v_change_percent > 2 THEN
      v_direction := 'up';
    ELSIF v_change_percent < -2 THEN
      v_direction := 'down';
    ELSE
      v_direction := 'stable';
    END IF;
  ELSE
    v_change := 0;
    v_change_percent := 0;
    v_direction := 'stable';
  END IF;
  
  avg_price := v_current_avg;
  price_change := v_change;
  price_change_percent := v_change_percent;
  trend_direction := v_direction;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh price trends (run daily via cron)
CREATE OR REPLACE FUNCTION refresh_price_trends() RETURNS void AS $$
BEGIN
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY item_price_summary;
  
  -- Generate daily trends for last 30 days
  INSERT INTO price_trends (
    item_name, store_name, period_type, period_start, period_end,
    avg_price, min_price, max_price, sample_count,
    price_change, price_change_percent, trend_direction
  )
  SELECT 
    item_name,
    store_name,
    'daily',
    date_trunc('day', created_at),
    date_trunc('day', created_at) + INTERVAL '1 day',
    AVG(price),
    MIN(price),
    MAX(price),
    COUNT(*),
    0, -- Will be calculated by trigger
    0,
    'stable'
  FROM price_history
  WHERE created_at >= NOW() - INTERVAL '30 days'
    AND status = 'active'
  GROUP BY item_name, store_name, date_trunc('day', created_at)
  ON CONFLICT DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

-- Trigger to update date components on insert
CREATE OR REPLACE FUNCTION update_price_date_components() RETURNS TRIGGER AS $$
BEGIN
  NEW.day_of_week := EXTRACT(DOW FROM NEW.created_at);
  NEW.week_of_year := EXTRACT(WEEK FROM NEW.created_at);
  NEW.month := EXTRACT(MONTH FROM NEW.created_at);
  NEW.year := EXTRACT(YEAR FROM NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_price_date_components
  BEFORE INSERT ON price_history
  FOR EACH ROW
  EXECUTE FUNCTION update_price_date_components();
