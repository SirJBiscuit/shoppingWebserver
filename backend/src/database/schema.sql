CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, profile_name)
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    typical_quantity DECIMAL(10, 2),
    typical_unit VARCHAR(50),
    average_price DECIMAL(10, 2),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) DEFAULT 'Shopping List',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
    id SERIAL PRIMARY KEY,
    shopping_list_id INTEGER REFERENCES shopping_lists(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    price DECIMAL(10, 2),
    is_checked BOOLEAN DEFAULT false,
    category VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    price DECIMAL(10, 2),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    current_quantity DECIMAL(10, 2),
    unit VARCHAR(50),
    percentage_left INTEGER CHECK (percentage_left >= 0 AND percentage_left <= 100),
    last_purchased TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, profile_id, item_id)
);

CREATE TABLE IF NOT EXISTS item_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    total_purchases INTEGER DEFAULT 0,
    average_days_between_purchases DECIMAL(10, 2),
    preferred_quantity DECIMAL(10, 2),
    preferred_unit VARCHAR(50),
    last_purchase_date TIMESTAMP,
    UNIQUE(user_id, item_id)
);

CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_profile_id ON items(profile_id);
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX idx_purchase_history_item_id ON purchase_history(item_id);
CREATE INDEX idx_inventory_user_id ON inventory(user_id);
CREATE INDEX idx_item_statistics_user_id ON item_statistics(user_id);
