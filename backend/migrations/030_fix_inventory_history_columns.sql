-- Migration 030: Fix inventory_history column names to match backend code
-- The backend uses 'quantity' and 'expiry_date' but migration 029 created 'current_quantity' and 'estimated_expiry_date'

-- Drop the table if it exists and recreate with correct column names
DROP TABLE IF EXISTS inventory_history;

CREATE TABLE inventory_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    storage_location VARCHAR(50),
    custom_location_id INTEGER,
    category VARCHAR(100),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    bought_date DATE,
    opened_date DATE,
    expiry_date TIMESTAMP,
    removed_date DATE NOT NULL,
    removal_reason VARCHAR(50),
    price DECIMAL(10,2),
    store VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for performance
CREATE INDEX idx_inventory_history_user_id ON inventory_history(user_id, removed_date DESC);
