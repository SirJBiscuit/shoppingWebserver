-- Migration: Shopping List Templates
-- Creates tables for saving shopping lists as reusable templates

-- Shopping list templates table
CREATE TABLE IF NOT EXISTS shopping_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    times_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template items table
CREATE TABLE IF NOT EXISTS template_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES shopping_templates(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit VARCHAR(50),
    category VARCHAR(100),
    item_icon VARCHAR(10),
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shopping_templates_user ON shopping_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_templates_public ON shopping_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_template_items_template ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_template_items_sort ON template_items(sort_order);

-- Comments
COMMENT ON TABLE shopping_templates IS 'Reusable shopping list templates created by users';
COMMENT ON TABLE template_items IS 'Items within each shopping list template';
COMMENT ON COLUMN shopping_templates.is_public IS 'Whether template can be shared with other users';
COMMENT ON COLUMN shopping_templates.times_used IS 'Track how often template is used';
