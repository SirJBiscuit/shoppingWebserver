-- Schema v4: Smart cart packing rules and user preferences

-- Create packing rules table
CREATE TABLE IF NOT EXISTS packing_rules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'item_placement', 'bag_separation', 'weight_limit', 'fragile_protection'
    rule_name VARCHAR(255) NOT NULL,
    rule_config JSONB NOT NULL, -- Flexible JSON config for different rule types
    priority INTEGER DEFAULT 0, -- Higher priority rules apply first
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_packing_rules_user ON packing_rules(user_id);
CREATE INDEX idx_packing_rules_type ON packing_rules(rule_type);

-- Create user preferences table for app settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT true,
    default_store VARCHAR(100),
    auto_sort_by_aisle BOOLEAN DEFAULT true,
    show_prices BOOLEAN DEFAULT true,
    show_item_images BOOLEAN DEFAULT true,
    packing_mode VARCHAR(50) DEFAULT 'smart', -- 'smart', 'manual', 'custom'
    preferences JSONB DEFAULT '{}', -- Additional flexible preferences
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default packing rules for all users
INSERT INTO packing_rules (user_id, rule_type, rule_name, rule_config, priority)
SELECT 
    u.id,
    'item_placement',
    'Cold items last',
    '{"tags": ["Cold", "Frozen"], "position": "last", "reason": "Keep cold items cold until checkout"}'::jsonb,
    100
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM packing_rules pr 
    WHERE pr.user_id = u.id AND pr.rule_name = 'Cold items last'
);

INSERT INTO packing_rules (user_id, rule_type, rule_name, rule_config, priority)
SELECT 
    u.id,
    'bag_separation',
    'Eggs separate bag',
    '{"items": ["egg", "eggs"], "separate_bag": true, "reason": "Prevent crushing"}'::jsonb,
    95
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM packing_rules pr 
    WHERE pr.user_id = u.id AND pr.rule_name = 'Eggs separate bag'
);

INSERT INTO packing_rules (user_id, rule_type, rule_name, rule_config, priority)
SELECT 
    u.id,
    'fragile_protection',
    'No breakables on bottom',
    '{"tags": ["Fragile"], "items": ["bread", "chips", "eggs", "produce"], "position": "top", "reason": "Prevent crushing"}'::jsonb,
    90
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM packing_rules pr 
    WHERE pr.user_id = u.id AND pr.rule_name = 'No breakables on bottom'
);

INSERT INTO packing_rules (user_id, rule_type, rule_name, rule_config, priority)
SELECT 
    u.id,
    'weight_limit',
    'Heavy items on bottom',
    '{"tags": ["Heavy"], "items": ["milk", "juice", "soda", "water"], "position": "bottom", "max_weight_per_bag": 25, "reason": "Distribute weight evenly"}'::jsonb,
    85
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM packing_rules pr 
    WHERE pr.user_id = u.id AND pr.rule_name = 'Heavy items on bottom'
);

INSERT INTO packing_rules (user_id, rule_type, rule_name, rule_config, priority)
SELECT 
    u.id,
    'bag_separation',
    'Cleaning products separate',
    '{"tags": ["Cleaning"], "separate_bag": true, "reason": "Keep away from food"}'::jsonb,
    80
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM packing_rules pr 
    WHERE pr.user_id = u.id AND pr.rule_name = 'Cleaning products separate'
);

-- Create default user preferences for existing users
INSERT INTO user_preferences (user_id, dark_mode, auto_sort_by_aisle, packing_mode)
SELECT id, true, true, 'smart'
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up WHERE up.user_id = users.id
);

-- Add packing_order to shopping_list_items
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS packing_order INTEGER;
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS bag_number INTEGER;
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS packing_position VARCHAR(20); -- 'bottom', 'middle', 'top'
