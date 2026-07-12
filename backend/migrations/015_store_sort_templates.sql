-- Migration: Store Sort Templates
-- Creates tables for store-specific sorting rules and category ordering

-- Store sort templates table
CREATE TABLE IF NOT EXISTS store_sort_templates (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES store_locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category sort order for each template
CREATE TABLE IF NOT EXISTS template_category_order (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES store_sort_templates(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL,
    zone VARCHAR(50), -- e.g., 'entrance', 'middle', 'back', 'frozen'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sorting rules (e.g., "cold items last", "produce first")
CREATE TABLE IF NOT EXISTS template_sort_rules (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES store_sort_templates(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'category_order', 'temperature', 'fragile', 'weight'
    rule_value TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_sort_templates_store ON store_sort_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_template_category_order_template ON template_category_order(template_id);
CREATE INDEX IF NOT EXISTS idx_template_category_order_sort ON template_category_order(sort_order);
CREATE INDEX IF NOT EXISTS idx_template_sort_rules_template ON template_sort_rules(template_id);

-- Insert default sorting rules for common stores
-- Kroger default template
DO $$
DECLARE
    kroger_template_id INTEGER;
BEGIN
    -- Create default Kroger template (not tied to specific store)
    INSERT INTO store_sort_templates (name, description, is_default, created_by)
    VALUES ('Kroger Standard Layout', 'Standard Kroger store layout with produce first, cold items last', true, NULL)
    RETURNING id INTO kroger_template_id;
    
    -- Add category ordering (typical Kroger layout)
    INSERT INTO template_category_order (template_id, category_name, sort_order, zone) VALUES
    (kroger_template_id, 'Produce', 1, 'entrance'),
    (kroger_template_id, 'Bakery', 2, 'entrance'),
    (kroger_template_id, 'Deli', 3, 'entrance'),
    (kroger_template_id, 'Meat & Seafood', 4, 'back'),
    (kroger_template_id, 'Pantry Staples', 5, 'middle'),
    (kroger_template_id, 'Canned Goods', 6, 'middle'),
    (kroger_template_id, 'Pasta & Rice', 7, 'middle'),
    (kroger_template_id, 'Snacks', 8, 'middle'),
    (kroger_template_id, 'Beverages', 9, 'middle'),
    (kroger_template_id, 'Breakfast', 10, 'middle'),
    (kroger_template_id, 'Condiments', 11, 'middle'),
    (kroger_template_id, 'Baking', 12, 'middle'),
    (kroger_template_id, 'Cleaning', 13, 'back'),
    (kroger_template_id, 'Personal Care', 14, 'back'),
    (kroger_template_id, 'Dairy', 15, 'back'),
    (kroger_template_id, 'Frozen', 16, 'frozen');
    
    -- Add sorting rules
    INSERT INTO template_sort_rules (template_id, rule_type, rule_value, priority) VALUES
    (kroger_template_id, 'temperature', 'frozen_last', 100),
    (kroger_template_id, 'temperature', 'refrigerated_near_end', 90),
    (kroger_template_id, 'category_order', 'produce_first', 80),
    (kroger_template_id, 'fragile', 'eggs_bread_top', 70);
END $$;

-- Walmart default template
DO $$
DECLARE
    walmart_template_id INTEGER;
BEGIN
    INSERT INTO store_sort_templates (name, description, is_default, created_by)
    VALUES ('Walmart Standard Layout', 'Standard Walmart supercenter layout', true, NULL)
    RETURNING id INTO walmart_template_id;
    
    INSERT INTO template_category_order (template_id, category_name, sort_order, zone) VALUES
    (walmart_template_id, 'Produce', 1, 'entrance'),
    (walmart_template_id, 'Bakery', 2, 'entrance'),
    (walmart_template_id, 'Deli', 3, 'entrance'),
    (walmart_template_id, 'Meat & Seafood', 4, 'back'),
    (walmart_template_id, 'Pantry Staples', 5, 'middle'),
    (walmart_template_id, 'Canned Goods', 6, 'middle'),
    (walmart_template_id, 'Snacks', 7, 'middle'),
    (walmart_template_id, 'Beverages', 8, 'middle'),
    (walmart_template_id, 'Breakfast', 9, 'middle'),
    (walmart_template_id, 'Dairy', 10, 'back'),
    (walmart_template_id, 'Frozen', 11, 'frozen');
    
    INSERT INTO template_sort_rules (template_id, rule_type, rule_value, priority) VALUES
    (walmart_template_id, 'temperature', 'frozen_last', 100),
    (walmart_template_id, 'temperature', 'refrigerated_near_end', 90);
END $$;

COMMENT ON TABLE store_sort_templates IS 'Store-specific sorting templates for optimized shopping routes';
COMMENT ON TABLE template_category_order IS 'Category ordering within each store template';
COMMENT ON TABLE template_sort_rules IS 'Special sorting rules like cold items last, fragile items on top';
