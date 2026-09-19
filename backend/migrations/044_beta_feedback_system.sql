-- Migration 044: Beta Feedback System
-- Adds organized feedback system for beta testers

-- ============================================================================
-- 1. BETA FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS beta_feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  beta_tester_id INTEGER REFERENCES beta_testers(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'idea', 'general')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN (
    'new', 'in_progress', 'fixed', 'wont_fix',           -- Bug statuses
    'requested', 'planned', 'in_development', 'released', -- Feature statuses
    'submitted', 'under_review', 'accepted', 'declined'   -- Idea statuses
  )),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  vote_count INTEGER DEFAULT 0,
  admin_notes TEXT,
  admin_response TEXT,
  responded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for beta_feedback
CREATE INDEX idx_feedback_user ON beta_feedback(user_id);
CREATE INDEX idx_feedback_beta_tester ON beta_feedback(beta_tester_id);
CREATE INDEX idx_feedback_type ON beta_feedback(type);
CREATE INDEX idx_feedback_status ON beta_feedback(status);
CREATE INDEX idx_feedback_severity ON beta_feedback(severity);
CREATE INDEX idx_feedback_created ON beta_feedback(created_at DESC);
CREATE INDEX idx_feedback_type_status ON beta_feedback(type, status);

-- ============================================================================
-- 2. FEEDBACK ATTACHMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER REFERENCES beta_feedback(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for feedback_attachments
CREATE INDEX idx_attachments_feedback ON feedback_attachments(feedback_id);

-- ============================================================================
-- 3. FEEDBACK VOTES TABLE (for feature requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback_votes (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER REFERENCES beta_feedback(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feedback_id, user_id)
);

-- Indexes for feedback_votes
CREATE INDEX idx_votes_feedback ON feedback_votes(feedback_id);
CREATE INDEX idx_votes_user ON feedback_votes(user_id);

-- ============================================================================
-- 4. BETA THANK YOU MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS beta_thank_you_messages (
  id SERIAL PRIMARY KEY,
  beta_tester_id INTEGER REFERENCES beta_testers(id) ON DELETE CASCADE,
  sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for beta_thank_you_messages
CREATE INDEX idx_thanks_beta_tester ON beta_thank_you_messages(beta_tester_id);
CREATE INDEX idx_thanks_sent_by ON beta_thank_you_messages(sent_by);
CREATE INDEX idx_thanks_unread ON beta_thank_you_messages(beta_tester_id, is_read);

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp for beta_feedback
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_timestamp
  BEFORE UPDATE ON beta_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_timestamp();

-- Trigger to update feedback_count in beta_testers
CREATE OR REPLACE FUNCTION update_beta_feedback_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE beta_testers
    SET feedback_count = feedback_count + 1
    WHERE id = NEW.beta_tester_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE beta_testers
    SET feedback_count = feedback_count - 1
    WHERE id = OLD.beta_tester_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_beta_feedback_count
  AFTER INSERT OR DELETE ON beta_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_beta_feedback_count();

-- Trigger to update vote_count in beta_feedback
CREATE OR REPLACE FUNCTION update_feedback_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE beta_feedback
    SET vote_count = vote_count + 1
    WHERE id = NEW.feedback_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE beta_feedback
    SET vote_count = vote_count - 1
    WHERE id = OLD.feedback_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_vote_count
  AFTER INSERT OR DELETE ON feedback_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_vote_count();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Updated function to generate beta code with COLOR-YEAR-XXXXX format
CREATE OR REPLACE FUNCTION generate_beta_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
  colors TEXT[] := ARRAY['BLUE', 'RED', 'GREEN', 'PURPLE', 'ORANGE', 'YELLOW', 'PINK', 'TEAL', 'CYAN', 'LIME'];
  random_color TEXT;
  current_year TEXT;
  random_chars TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes I, O, 0, 1
BEGIN
  LOOP
    -- Pick random color
    random_color := colors[1 + floor(random() * array_length(colors, 1))::int];
    
    -- Get current year
    current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Generate 5 random characters
    random_chars := '';
    FOR i IN 1..5 LOOP
      random_chars := random_chars || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    
    -- Combine: COLOR-YEAR-XXXXX
    new_code := random_color || '-' || current_year || '-' || random_chars;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM beta_testing_codes WHERE code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to get feedback statistics
CREATE OR REPLACE FUNCTION get_feedback_stats()
RETURNS TABLE (
  total_feedback BIGINT,
  bug_count BIGINT,
  bug_critical BIGINT,
  bug_high BIGINT,
  bug_medium BIGINT,
  bug_low BIGINT,
  feature_count BIGINT,
  feature_total_votes BIGINT,
  idea_count BIGINT,
  idea_under_review BIGINT,
  general_count BIGINT,
  general_avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_feedback,
    COUNT(*) FILTER (WHERE type = 'bug')::BIGINT as bug_count,
    COUNT(*) FILTER (WHERE type = 'bug' AND severity = 'critical')::BIGINT as bug_critical,
    COUNT(*) FILTER (WHERE type = 'bug' AND severity = 'high')::BIGINT as bug_high,
    COUNT(*) FILTER (WHERE type = 'bug' AND severity = 'medium')::BIGINT as bug_medium,
    COUNT(*) FILTER (WHERE type = 'bug' AND severity = 'low')::BIGINT as bug_low,
    COUNT(*) FILTER (WHERE type = 'feature')::BIGINT as feature_count,
    COALESCE(SUM(vote_count) FILTER (WHERE type = 'feature'), 0)::BIGINT as feature_total_votes,
    COUNT(*) FILTER (WHERE type = 'idea')::BIGINT as idea_count,
    COUNT(*) FILTER (WHERE type = 'idea' AND status = 'under_review')::BIGINT as idea_under_review,
    COUNT(*) FILTER (WHERE type = 'general')::BIGINT as general_count,
    ROUND(AVG(rating) FILTER (WHERE type = 'general' AND rating IS NOT NULL), 1) as general_avg_rating
  FROM beta_feedback;
END;
$$ LANGUAGE plpgsql;

-- Function to get top voted features
CREATE OR REPLACE FUNCTION get_top_voted_features(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id INTEGER,
  title VARCHAR(255),
  description TEXT,
  vote_count INTEGER,
  status VARCHAR(50),
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bf.id,
    bf.title,
    bf.description,
    bf.vote_count,
    bf.status,
    bf.created_at
  FROM beta_feedback bf
  WHERE bf.type = 'feature'
  ORDER BY bf.vote_count DESC, bf.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get critical bugs
CREATE OR REPLACE FUNCTION get_critical_bugs()
RETURNS TABLE (
  id INTEGER,
  title VARCHAR(255),
  description TEXT,
  severity VARCHAR(20),
  status VARCHAR(50),
  beta_tester_display_name VARCHAR(150),
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bf.id,
    bf.title,
    bf.description,
    bf.severity,
    bf.status,
    bt.display_name,
    bf.created_at
  FROM beta_feedback bf
  JOIN beta_testers bt ON bf.beta_tester_id = bt.id
  WHERE bf.type = 'bug' AND bf.severity IN ('critical', 'high')
  ORDER BY 
    CASE bf.severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
    END,
    bf.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON TABLE beta_feedback IS 'Stores organized feedback from beta testers';
COMMENT ON TABLE feedback_attachments IS 'Stores file attachments for feedback (screenshots, etc.)';
COMMENT ON TABLE feedback_votes IS 'Tracks votes on feature requests';
COMMENT ON TABLE beta_thank_you_messages IS 'Admin appreciation messages to beta testers';

COMMENT ON COLUMN beta_feedback.type IS 'Feedback type: bug, feature, idea, or general';
COMMENT ON COLUMN beta_feedback.severity IS 'Bug severity: critical, high, medium, or low';
COMMENT ON COLUMN beta_feedback.status IS 'Status varies by type (new/fixed for bugs, requested/released for features, etc.)';
COMMENT ON COLUMN beta_feedback.vote_count IS 'Number of votes (mainly for feature requests)';
COMMENT ON COLUMN beta_feedback.rating IS 'Star rating 1-5 (mainly for general feedback)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
