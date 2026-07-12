-- Migration: Item Check History for Learning Shopping Patterns
-- Tracks when users check off items to learn their shopping route

CREATE TABLE IF NOT EXISTS item_check_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    list_id INTEGER REFERENCES shopping_lists(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES shopping_list_items(id) ON DELETE CASCADE,
    check_off_order INTEGER NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_check_history_user ON item_check_history(user_id);
CREATE INDEX IF NOT EXISTS idx_item_check_history_list ON item_check_history(list_id);
CREATE INDEX IF NOT EXISTS idx_item_check_history_checked_at ON item_check_history(checked_at);

COMMENT ON TABLE item_check_history IS 'Tracks order in which users check off items to learn shopping patterns';
COMMENT ON COLUMN item_check_history.check_off_order IS 'Sequential order item was checked (1st, 2nd, 3rd, etc.)';
