-- Enhanced Schema for Shopping List App v2
-- Adds: Images, Recipes, Pantry, Categories, Receipts

-- ============================================
-- EXISTING TABLES (keep as-is)
-- ============================================
-- users, profiles, items, shopping_lists, shopping_list_items
-- purchase_history, inventory, item_statistics

-- ============================================
-- NEW TABLES
-- ============================================

-- Categories with icons and smart ordering
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    shopping_order INTEGER DEFAULT 0,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item metadata (common items with icons, barcodes, etc.)
CREATE TABLE IF NOT EXISTS item_metadata (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    icon VARCHAR(50),
    barcode VARCHAR(100),
    aliases TEXT[],
    avg_price DECIMAL(10, 2),
    common_stores TEXT[],
    image_url TEXT,
    is_common BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Images storage
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    image_type VARCHAR(50) NOT NULL,
    related_id INTEGER,
    ai_labels JSONB,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    servings INTEGER,
    prep_time INTEGER,
    cook_time INTEGER,
    instructions TEXT,
    image_url TEXT,
    source_url TEXT,
    is_public BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    is_optional BOOLEAN DEFAULT false,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Pantry inventory (what user has at home)
CREATE TABLE IF NOT EXISTS pantry_inventory (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    barcode VARCHAR(100),
    category_id INTEGER REFERENCES categories(id),
    image_url TEXT,
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE,
    source VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, profile_id, item_name)
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(255),
    total_amount DECIMAL(10, 2),
    receipt_date DATE,
    image_url TEXT,
    thumbnail_url TEXT,
    ocr_data JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receipt items (parsed from receipt)
CREATE TABLE IF NOT EXISTS receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    category_id INTEGER REFERENCES categories(id),
    barcode VARCHAR(100)
);

-- Store prices (for price comparison)
CREATE TABLE IF NOT EXISTS store_prices (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    store_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50),
    barcode VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50),
    UNIQUE(item_name, store_name, barcode)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_item_metadata_category ON item_metadata(category_id);
CREATE INDEX idx_item_metadata_barcode ON item_metadata(barcode);
CREATE INDEX idx_item_metadata_common ON item_metadata(is_common);

CREATE INDEX idx_images_user_type ON images(user_id, image_type);
CREATE INDEX idx_images_related ON images(image_type, related_id);

CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_recipes_public ON recipes(is_public);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

CREATE INDEX idx_pantry_user ON pantry_inventory(user_id);
CREATE INDEX idx_pantry_category ON pantry_inventory(category_id);
CREATE INDEX idx_pantry_barcode ON pantry_inventory(barcode);
CREATE INDEX idx_pantry_expiry ON pantry_inventory(expiry_date);

CREATE INDEX idx_receipts_user ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);
CREATE INDEX idx_receipt_items_receipt ON receipt_items(receipt_id);

CREATE INDEX idx_store_prices_item ON store_prices(item_name);
CREATE INDEX idx_store_prices_store ON store_prices(store_name);
CREATE INDEX idx_store_prices_barcode ON store_prices(barcode);

-- ============================================
-- SEED DATA - Common Categories
-- ============================================

INSERT INTO categories (name, icon, color, sort_order, shopping_order, reason) VALUES
('Produce', '🥬', '#4ade80', 1, 8, 'Pick last - fresh items'),
('Meat & Seafood', '🥩', '#ef4444', 2, 9, 'Pick last - keep cold'),
('Dairy & Eggs', '🥛', '#60a5fa', 3, 10, 'Pick last - refrigerated'),
('Frozen', '🧊', '#38bdf8', 4, 11, 'Pick last - stays frozen'),
('Bakery', '🍞', '#fbbf24', 5, 12, 'Pick last - avoid crushing'),
('Pantry Staples', '🥫', '#a78bfa', 6, 1, 'Pick first - shelf stable'),
('Snacks', '🍿', '#fb923c', 7, 2, 'Pick first - shelf stable'),
('Beverages', '🥤', '#22d3ee', 8, 3, 'Pick early - can be heavy'),
('Condiments & Sauces', '🍯', '#f472b6', 9, 4, 'Pick early - shelf stable'),
('Breakfast', '🥞', '#facc15', 10, 5, 'Pick early - shelf stable'),
('Household', '🧹', '#94a3b8', 11, 6, 'Pick early - non-food'),
('Personal Care', '🧴', '#c084fc', 12, 7, 'Pick early - non-food'),
('Other', '📦', '#64748b', 13, 13, 'Default category');

-- ============================================
-- SEED DATA - Common Items with Icons
-- ============================================

INSERT INTO item_metadata (name, category_id, icon, is_common) VALUES
-- Produce
('Apples', (SELECT id FROM categories WHERE name = 'Produce'), '🍎', true),
('Bananas', (SELECT id FROM categories WHERE name = 'Produce'), '🍌', true),
('Oranges', (SELECT id FROM categories WHERE name = 'Produce'), '🍊', true),
('Tomatoes', (SELECT id FROM categories WHERE name = 'Produce'), '🍅', true),
('Lettuce', (SELECT id FROM categories WHERE name = 'Produce'), '🥬', true),
('Carrots', (SELECT id FROM categories WHERE name = 'Produce'), '🥕', true),
('Potatoes', (SELECT id FROM categories WHERE name = 'Produce'), '🥔', true),
('Onions', (SELECT id FROM categories WHERE name = 'Produce'), '🧅', true),
('Broccoli', (SELECT id FROM categories WHERE name = 'Produce'), '🥦', true),
('Strawberries', (SELECT id FROM categories WHERE name = 'Produce'), '🍓', true),

-- Meat & Seafood
('Chicken', (SELECT id FROM categories WHERE name = 'Meat & Seafood'), '🍗', true),
('Beef', (SELECT id FROM categories WHERE name = 'Meat & Seafood'), '🥩', true),
('Pork', (SELECT id FROM categories WHERE name = 'Meat & Seafood'), '🥓', true),
('Fish', (SELECT id FROM categories WHERE name = 'Meat & Seafood'), '🐟', true),
('Shrimp', (SELECT id FROM categories WHERE name = 'Meat & Seafood'), '🦐', true),

-- Dairy & Eggs
('Milk', (SELECT id FROM categories WHERE name = 'Dairy & Eggs'), '🥛', true),
('Eggs', (SELECT id FROM categories WHERE name = 'Dairy & Eggs'), '🥚', true),
('Cheese', (SELECT id FROM categories WHERE name = 'Dairy & Eggs'), '🧀', true),
('Butter', (SELECT id FROM categories WHERE name = 'Dairy & Eggs'), '🧈', true),
('Yogurt', (SELECT id FROM categories WHERE name = 'Dairy & Eggs'), '🥛', true),

-- Bakery
('Bread', (SELECT id FROM categories WHERE name = 'Bakery'), '🍞', true),
('Bagels', (SELECT id FROM categories WHERE name = 'Bakery'), '🥯', true),
('Croissants', (SELECT id FROM categories WHERE name = 'Bakery'), '🥐', true),

-- Pantry Staples
('Rice', (SELECT id FROM categories WHERE name = 'Pantry Staples'), '🍚', true),
('Pasta', (SELECT id FROM categories WHERE name = 'Pantry Staples'), '🍝', true),
('Beans', (SELECT id FROM categories WHERE name = 'Pantry Staples'), '🫘', true),
('Flour', (SELECT id FROM categories WHERE name = 'Pantry Staples'), '🌾', true),
('Sugar', (SELECT id FROM categories WHERE name = 'Pantry Staples'), '🍬', true),
('Salt', (SELECT id FROM categories WHERE name = 'Pantry Staples'), '🧂', true),
('Oil', (SELECT id FROM categories WHERE name = 'Pantry Staples'), '🫗', true),

-- Snacks
('Chips', (SELECT id FROM categories WHERE name = 'Snacks'), '🥔', true),
('Cookies', (SELECT id FROM categories WHERE name = 'Snacks'), '🍪', true),
('Crackers', (SELECT id FROM categories WHERE name = 'Snacks'), '🍘', true),
('Granola Bars', (SELECT id FROM categories WHERE name = 'Snacks'), '🍫', true),

-- Beverages
('Water', (SELECT id FROM categories WHERE name = 'Beverages'), '💧', true),
('Juice', (SELECT id FROM categories WHERE name = 'Beverages'), '🧃', true),
('Soda', (SELECT id FROM categories WHERE name = 'Beverages'), '🥤', true),
('Coffee', (SELECT id FROM categories WHERE name = 'Beverages'), '☕', true),
('Tea', (SELECT id FROM categories WHERE name = 'Beverages'), '🍵', true),

-- Breakfast
('Cereal', (SELECT id FROM categories WHERE name = 'Breakfast'), '🥣', true),
('Oatmeal', (SELECT id FROM categories WHERE name = 'Breakfast'), '🥣', true),
('Pancake Mix', (SELECT id FROM categories WHERE name = 'Breakfast'), '🥞', true);
