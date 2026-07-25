-- Migration 029: Fix missing inventory columns
-- Adds any missing columns that might not exist

-- Add columns if they don't exist (safe to run multiple times)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS estimated_expiry_date TIMESTAMP;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS is_opened BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS current_quantity DECIMAL(10,2) DEFAULT 1;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS storage_location VARCHAR(50) DEFAULT 'pantry';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS custom_location_id INTEGER REFERENCES custom_storage_locations(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add index on user_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_user_id') THEN
        CREATE INDEX idx_inventory_user_id ON inventory(user_id);
    END IF;
END $$;

-- Add index on expiry date for faster queries
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_expiry_date') THEN
        CREATE INDEX idx_inventory_expiry_date ON inventory(estimated_expiry_date) WHERE estimated_expiry_date IS NOT NULL;
    END IF;
END $$;

-- Ensure inventory_history table exists
CREATE TABLE IF NOT EXISTS inventory_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    storage_location VARCHAR(50),
    custom_location_id INTEGER,
    category VARCHAR(100),
    current_quantity DECIMAL(10,2),
    unit VARCHAR(50),
    bought_date DATE,
    estimated_expiry_date TIMESTAMP,
    actual_expiry_date TIMESTAMP,
    removed_date DATE NOT NULL,
    removal_reason VARCHAR(50),
    price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index on history user_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_history_user_id') THEN
        CREATE INDEX idx_inventory_history_user_id ON inventory_history(user_id, removed_date DESC);
    END IF;
END $$;
