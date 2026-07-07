-- Schema v3: Add tags support and user preferences for icons

-- Add tags column to item_metadata
ALTER TABLE item_metadata ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create user item preferences table (remembers user's icon/tag choices)
CREATE TABLE IF NOT EXISTS user_item_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100),
    custom_icon VARCHAR(50),
    custom_tags TEXT[],
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_name)
);

CREATE INDEX idx_user_item_prefs_user ON user_item_preferences(user_id);
CREATE INDEX idx_user_item_prefs_barcode ON user_item_preferences(barcode);
CREATE INDEX idx_user_item_prefs_name ON user_item_preferences(item_name);

-- Update existing common items with tags
UPDATE item_metadata SET tags = ARRAY['Food', 'Fresh', 'Produce'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Produce');
UPDATE item_metadata SET tags = ARRAY['Food', 'Meat', 'Cold'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Meat & Seafood');
UPDATE item_metadata SET tags = ARRAY['Food', 'Dairy', 'Cold'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Dairy & Eggs');
UPDATE item_metadata SET tags = ARRAY['Food', 'Frozen', 'Cold'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Frozen');
UPDATE item_metadata SET tags = ARRAY['Food', 'Bakery', 'Fresh'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Bakery');
UPDATE item_metadata SET tags = ARRAY['Food'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Pantry Staples');
UPDATE item_metadata SET tags = ARRAY['Food', 'Snack'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Snacks');
UPDATE item_metadata SET tags = ARRAY['Beverage', 'Food'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Beverages');
UPDATE item_metadata SET tags = ARRAY['Food'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Condiments & Sauces');
UPDATE item_metadata SET tags = ARRAY['Food'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Breakfast');
UPDATE item_metadata SET tags = ARRAY['Household', 'Cleaning'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Household');
UPDATE item_metadata SET tags = ARRAY['Personal Care'] WHERE category_id = (SELECT id FROM categories WHERE name = 'Personal Care');
