-- Migration 041: Admin Storage System
-- Creates tables for file storage, data management, and analytics

-- ============================================================================
-- STORAGE FILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  path TEXT NOT NULL,
  url TEXT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  thumbnail_path TEXT,
  CONSTRAINT valid_category CHECK (category IN ('images', 'sounds', 'documents', 'general'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_files_category ON storage_files(category);
CREATE INDEX IF NOT EXISTS idx_storage_files_uploaded_by ON storage_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_storage_files_uploaded_at ON storage_files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_storage_files_tags ON storage_files USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_storage_files_metadata ON storage_files USING GIN(metadata);

-- ============================================================================
-- STORAGE ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_analytics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_files INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  uploads_count INTEGER DEFAULT 0,
  deletions_count INTEGER DEFAULT 0,
  category_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_storage_analytics_date ON storage_analytics(date);

-- ============================================================================
-- STORAGE QUOTAS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_quotas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  max_storage_bytes BIGINT DEFAULT 104857600, -- 100MB default
  used_storage_bytes BIGINT DEFAULT 0,
  max_files INTEGER DEFAULT 1000,
  used_files INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- FILE ACCESS LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_access_log (
  id SERIAL PRIMARY KEY,
  file_id INTEGER REFERENCES storage_files(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'view', 'download', 'delete', 'update'
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT NOW()
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_storage_access_log_file_id ON storage_access_log(file_id);
CREATE INDEX IF NOT EXISTS idx_storage_access_log_user_id ON storage_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_access_log_accessed_at ON storage_access_log(accessed_at);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update storage analytics
CREATE OR REPLACE FUNCTION update_storage_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update today's analytics
  INSERT INTO storage_analytics (date, total_files, total_size_bytes, uploads_count, category_breakdown)
  VALUES (
    CURRENT_DATE,
    (SELECT COUNT(*) FROM storage_files),
    (SELECT COALESCE(SUM(size_bytes), 0) FROM storage_files),
    1,
    (SELECT jsonb_object_agg(category, count) FROM (
      SELECT category, COUNT(*) as count FROM storage_files GROUP BY category
    ) sub)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_files = (SELECT COUNT(*) FROM storage_files),
    total_size_bytes = (SELECT COALESCE(SUM(size_bytes), 0) FROM storage_files),
    uploads_count = storage_analytics.uploads_count + 1,
    category_breakdown = (SELECT jsonb_object_agg(category, count) FROM (
      SELECT category, COUNT(*) as count FROM storage_files GROUP BY category
    ) sub);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user quota
CREATE OR REPLACE FUNCTION update_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure quota record exists
  INSERT INTO storage_quotas (user_id, used_storage_bytes, used_files)
  VALUES (NEW.uploaded_by, NEW.size_bytes, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    used_storage_bytes = storage_quotas.used_storage_bytes + NEW.size_bytes,
    used_files = storage_quotas.used_files + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrease user quota on delete
CREATE OR REPLACE FUNCTION decrease_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE storage_quotas
  SET 
    used_storage_bytes = GREATEST(0, used_storage_bytes - OLD.size_bytes),
    used_files = GREATEST(0, used_files - 1),
    updated_at = NOW()
  WHERE user_id = OLD.uploaded_by;
  
  -- Update analytics
  INSERT INTO storage_analytics (date, total_files, total_size_bytes, deletions_count, category_breakdown)
  VALUES (
    CURRENT_DATE,
    (SELECT COUNT(*) FROM storage_files),
    (SELECT COALESCE(SUM(size_bytes), 0) FROM storage_files),
    1,
    (SELECT jsonb_object_agg(category, count) FROM (
      SELECT category, COUNT(*) as count FROM storage_files GROUP BY category
    ) sub)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_files = (SELECT COUNT(*) FROM storage_files),
    total_size_bytes = (SELECT COALESCE(SUM(size_bytes), 0) FROM storage_files),
    deletions_count = storage_analytics.deletions_count + 1,
    category_breakdown = (SELECT jsonb_object_agg(category, count) FROM (
      SELECT category, COUNT(*) as count FROM storage_files GROUP BY category
    ) sub);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update analytics on file upload
CREATE TRIGGER trigger_update_storage_analytics
AFTER INSERT ON storage_files
FOR EACH ROW
EXECUTE FUNCTION update_storage_analytics();

-- Trigger to update user quota on file upload
CREATE TRIGGER trigger_update_user_quota
AFTER INSERT ON storage_files
FOR EACH ROW
EXECUTE FUNCTION update_user_quota();

-- Trigger to decrease user quota on file delete
CREATE TRIGGER trigger_decrease_user_quota
AFTER DELETE ON storage_files
FOR EACH ROW
EXECUTE FUNCTION decrease_user_quota();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create default quotas for existing users
INSERT INTO storage_quotas (user_id, max_storage_bytes, max_files)
SELECT id, 104857600, 1000 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Initialize today's analytics
INSERT INTO storage_analytics (date, total_files, total_size_bytes, uploads_count, deletions_count, category_breakdown)
VALUES (
  CURRENT_DATE,
  0,
  0,
  0,
  0,
  '{}'::jsonb
)
ON CONFLICT (date) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE storage_files IS 'Stores metadata for all uploaded files';
COMMENT ON TABLE storage_analytics IS 'Daily storage usage analytics';
COMMENT ON TABLE storage_quotas IS 'User storage quotas and usage tracking';
COMMENT ON TABLE storage_access_log IS 'Audit log for file access';

COMMENT ON COLUMN storage_files.filename IS 'Unique filename on disk';
COMMENT ON COLUMN storage_files.original_name IS 'Original filename from upload';
COMMENT ON COLUMN storage_files.category IS 'File category: images, sounds, documents, general';
COMMENT ON COLUMN storage_files.metadata IS 'Additional file metadata (dimensions, duration, etc)';
COMMENT ON COLUMN storage_files.tags IS 'Searchable tags for organization';
COMMENT ON COLUMN storage_files.is_public IS 'Whether file is publicly accessible';
