-- AI App Builder Tables

-- Table for storing AI-generated apps
CREATE TABLE IF NOT EXISTS ai_generated_apps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'web', 'mobile', 'desktop'
    platform VARCHAR(50) NOT NULL, -- 'react', 'react-native', 'flutter', etc.
    features JSONB DEFAULT '[]', -- Array of feature names
    code JSONB NOT NULL, -- { react: '', css: '', reactNative: '', etc. }
    prompt TEXT, -- Original user prompt
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for app templates
CREATE TABLE IF NOT EXISTS app_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'ecommerce', 'social', 'productivity', etc.
    type VARCHAR(50) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    features JSONB DEFAULT '[]',
    code JSONB NOT NULL,
    preview_image TEXT,
    is_public BOOLEAN DEFAULT true,
    downloads INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for code snippets
CREATE TABLE IF NOT EXISTS code_snippets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code TEXT NOT NULL,
    category VARCHAR(100), -- 'authentication', 'api', 'ui', etc.
    description TEXT,
    language VARCHAR(50), -- 'javascript', 'typescript', 'css', etc.
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for AI generation analytics
CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    app_type VARCHAR(50),
    features JSONB,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_apps_user ON ai_generated_apps(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_apps_created ON ai_generated_apps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_category ON app_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_downloads ON app_templates(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_snippets_category ON code_snippets(category);
CREATE INDEX IF NOT EXISTS idx_snippets_user ON code_snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_user ON ai_generation_logs(user_id);

-- Insert some default templates
INSERT INTO app_templates (name, description, category, type, platform, features, code, is_public, downloads) VALUES
(
    'E-Commerce Store',
    'Complete online store with product catalog, cart, and checkout',
    'ecommerce',
    'web',
    'react',
    '["products", "cart", "checkout", "payment", "user-accounts"]',
    '{"react": "// E-commerce template code here", "css": "/* Styles */"}',
    true,
    150
),
(
    'Social Media App',
    'Social networking app with posts, comments, and likes',
    'social',
    'mobile',
    'react-native',
    '["posts", "comments", "likes", "profiles", "messaging"]',
    '{"reactNative": "// Social media template code here"}',
    true,
    200
),
(
    'Todo List App',
    'Simple task management application',
    'productivity',
    'web',
    'react',
    '["tasks", "categories", "due-dates", "priorities"]',
    '{"react": "// Todo app template code here", "css": "/* Styles */"}',
    true,
    300
),
(
    'Fitness Tracker',
    'Track workouts, calories, and progress',
    'health',
    'mobile',
    'react-native',
    '["workouts", "nutrition", "goals", "progress-charts"]',
    '{"reactNative": "// Fitness tracker template code here"}',
    true,
    180
),
(
    'Blog Platform',
    'Content management system for blogging',
    'content',
    'web',
    'react',
    '["posts", "comments", "categories", "search", "admin-panel"]',
    '{"react": "// Blog platform template code here", "css": "/* Styles */"}',
    true,
    220
);

-- Insert some default code snippets
INSERT INTO code_snippets (user_id, name, code, category, description, language, is_public, usage_count) VALUES
(
    1,
    'Login Form',
    'const LoginForm = () => { /* Login form code */ };',
    'authentication',
    'Reusable login form component with validation',
    'javascript',
    true,
    500
),
(
    1,
    'API Fetch Hook',
    'const useFetch = (url) => { /* Custom hook for API calls */ };',
    'api',
    'Custom React hook for fetching data',
    'javascript',
    true,
    450
),
(
    1,
    'Button Component',
    'const Button = ({ children, ...props }) => { /* Button component */ };',
    'ui',
    'Customizable button component',
    'javascript',
    true,
    600
),
(
    1,
    'Modal Component',
    'const Modal = ({ isOpen, onClose, children }) => { /* Modal component */ };',
    'ui',
    'Reusable modal/dialog component',
    'javascript',
    true,
    400
),
(
    1,
    'Form Validation',
    'const validateForm = (values) => { /* Validation logic */ };',
    'utilities',
    'Form validation utility function',
    'javascript',
    true,
    350
);

COMMENT ON TABLE ai_generated_apps IS 'Stores AI-generated applications created by users';
COMMENT ON TABLE app_templates IS 'Pre-built app templates for quick start';
COMMENT ON TABLE code_snippets IS 'Reusable code snippets and components';
COMMENT ON TABLE ai_generation_logs IS 'Analytics for AI app generation usage';
